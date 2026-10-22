import { http, HttpResponse, delay, ws } from "msw";
import { setupWorker } from "msw/browser";
import { toSocketIo } from "@mswjs/socket.io-binding";
import Decimal from "decimal.js";
import { z } from "zod";
import { transaction, seed, hashPassword, publicUser } from "./database";
import type { State } from "./database";
import type { Cart, Edition, Order, Quote, ResourceEvent } from "../contracts";
import { canonical, mergeCart, totals, transition } from "../rules";
const peers = new Set<ReturnType<typeof toSocketIo>>();
// O MSW 2.10 descarta o prefixo "/socket.io/" ao casar a URL do handshake.
const socket = ws.link("wss://realtime.kurio.test/");
let connected = true;
let lastEvent: { name: string; event: ResourceEvent } | undefined;
function emit(name: string, data: ResourceEvent["data"], userId?: string) {
  const event = {
    eventId: crypto.randomUUID(),
    resourceId: data.id,
    version: data.version,
    userId,
    data,
  };
  lastEvent = { name, event };
  if (connected) for (const p of peers) p.client.emit(name, event);
}
class Failure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
function fail(status: number, code: string, message: string): never {
  throw new Failure(status, code, message);
}
function current(s: State, required = false) {
  const session = s.session;
  if (!session || session.expiresAt < Date.now()) {
    s.session = null;
    if (required)
      fail(
        401,
        "UNAUTHENTICATED",
        "Sua sessão expirou. Entre novamente para continuar.",
      );
    return null;
  }
  return s.users.find((u) => u.id === session.userId) ?? null;
}
function cart(s: State): Cart {
  const id = current(s)?.id ?? "guest";
  return s.carts[id] ?? (s.carts[id] = { items: [], coupon: "", version: 1 });
}
function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) {
    throw new Failure(
      422,
      "VALIDATION",
      "Confira os campos informados.",
      Object.fromEntries(
        r.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    );
  }
  return r.data;
}
const email = z.email("Informe um e-mail válido.");
const text = z.string().trim().min(2, "Use pelo menos 2 caracteres.");
const password = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
  .regex(/[0-9]/, "Inclua um número.");
const profileSchema = z.object({
  name: text,
  username: text,
  email,
  ens: z.string(),
  walletAlias: text,
  avatar: z.string().max(1500000),
});
const walletSchema = z
  .object({
    name: text,
    alias: text,
    network: z.enum(["Ethereum", "Polygon", "Solana"]),
    address: z.string(),
    provider: z.enum(["MetaMask", "WalletConnect", "Coinbase Wallet"]),
    profile: text,
    email,
    ens: z.string(),
    referral: text,
  })
  .superRefine((w, ctx) => {
    if (
      !(
        w.network === "Solana"
          ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
          : /^0x[a-fA-F0-9]{40}$/
      ).test(w.address)
    )
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Endereço inválido para a rede selecionada.",
      });
  });
function quote(s: State): Quote {
  const c = cart(s);
  if (c.coupon && c.coupon !== "KURIO10")
    fail(422, "COUPON", "Cupom inválido ou expirado.");
  const items = c.items.map((item) => {
    const n = s.nfts.find((n) => n.id === item.nftId);
    if (!n || n.stock[item.edition] < item.quantity)
      fail(409, "STOCK", "Uma edição está indisponível. Ajuste o carrinho.");
    return {
      ...item,
      name: n.name,
      image: n.image,
      price: n.price,
      network: n.network,
    };
  });
  const fingerprint = JSON.stringify({
    items: items.map((i) => ({
      ...i,
      version: s.nfts.find((n) => n.id === i.nftId)!.version,
    })),
    coupon: c.coupon,
  });
  return {
    id: crypto.randomUUID(),
    fingerprint,
    expiresAt: Date.now() + 60000,
    items,
    ...totals(items, c.coupon),
    coupon: c.coupon,
    networks: [...new Set(items.map((i) => i.network))],
  };
}
function settle(s: State) {
  for (let i = 0; i < s.orders.length; i++) {
    const o = s.orders[i];
    if (o.status !== "pending" || o.settlesAt > Date.now()) continue;
    const next = transition(o, o.outcome);
    s.orders[i] = next;
    if (next.status === "confirmed" && !next.consumed) {
      const c = s.carts[next.userId];
      for (const item of next.quote.items) {
        const existing = c?.items.find(
          (i) => i.nftId === item.nftId && i.edition === item.edition,
        );
        if (existing)
          existing.quantity = Math.max(0, existing.quantity - item.quantity);
      }
      if (c) {
        c.items = c.items.filter((i) => i.quantity > 0);
        c.version++;
      }
      next.consumed = true;
    }
    if (next.status === "declined") {
      for (const item of next.quote.items) {
        const nft = s.nfts.find((n) => n.id === item.nftId)!;
        nft.stock[item.edition] += item.quantity;
        nft.version++;
        emit("nft.updated", nft);
      }
    }
    emit("order.updated", next, next.userId);
  }
}
async function route(
  s: State,
  request: Request,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const method = request.method;
  settle(s);
  if (path === "/demo" && method === "GET")
    return { scenario: s.scenario, socketConnected: connected };
  if (path === "/demo" && method === "POST") {
    if (body.action === "reset") {
      Object.assign(s, await seed());
      connected = true;
      return { message: "Simulação restaurada." };
    }
    if (body.scenario) {
      s.scenario = validate(
        z.enum([
          "normal",
          "empty",
          "slow",
          "variable",
          "offline",
          "server-error",
          "favorite-error",
          "expired",
          "declined",
          "timeout",
          "wallet-refused",
        ]),
        body.scenario,
      );
      if (s.scenario === "expired" && s.session) s.session.expiresAt = 0;
    }
    if (body.action === "price" || body.action === "stock") {
      const n = s.nfts.find((n) => n.id === (body.nftId ?? "1"))!;
      if (body.action === "price")
        n.price = new Decimal(n.price).plus("0.1").toFixed();
      else
        n.stock = Object.fromEntries(
          Object.keys(n.stock).map((k) => [k, 0]),
        ) as Record<Edition, number>;
      n.version++;
      emit("nft.updated", n);
    }
    if (body.action === "duplicate" && lastEvent)
      for (const p of peers) p.client.emit(lastEvent.name, lastEvent.event);
    if (body.action === "stale" && lastEvent)
      for (const p of peers)
        p.client.emit(lastEvent.name, {
          ...lastEvent.event,
          eventId: crypto.randomUUID(),
          version: lastEvent.event.version - 1,
        });
    if (body.action === "disconnect") {
      connected = false;
      for (const p of peers) p.rawClient.close();
    }
    if (body.action === "reconnect") connected = true;
    return { scenario: s.scenario, socketConnected: connected };
  }
  if (path === "/session" && method === "GET") {
    const u = current(s);
    return {
      user: u ? publicUser(u) : null,
      expiresAt: s.session?.expiresAt ?? 0,
    };
  }
  if (path === "/session" && method === "DELETE") {
    s.session = null;
    return { ok: true };
  }
  if (path === "/login" || path === "/register") {
    const data = validate(
      z.object({
        email,
        password: z.string(),
        name: z.string().optional(),
        username: z.string().optional(),
      }),
      body,
    );
    let user = s.users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase(),
    );
    if (path === "/register") {
      validate(z.object({ name: text, username: text, password }), body);
      if (user) fail(409, "CONFLICT", "Este e-mail já está cadastrado.");
      if (s.users.some((u) => u.username === data.username))
        fail(409, "CONFLICT", "Nome de usuário já utilizado.");
      const salt = crypto.randomUUID();
      user = {
        id: crypto.randomUUID(),
        name: data.name!,
        username: data.username!,
        email: data.email.toLowerCase(),
        ens: "",
        walletAlias: "Minha carteira",
        avatar: "",
        salt,
        hash: await hashPassword(data.password, salt),
      };
      s.users.push(user);
      s.wallets[user.id] = [];
    } else if (
      !user ||
      user.hash !== (await hashPassword(data.password, user.salt))
    )
      fail(401, "CREDENTIALS", "E-mail ou senha incorretos.");
    s.session = { userId: user!.id, expiresAt: Date.now() + 3600000 };
    const own = s.carts[user!.id] ?? { items: [], coupon: "", version: 1 };
    const merged = mergeCart(own.items, s.carts.guest.items, s.nfts);
    s.carts[user!.id] = {
      ...own,
      coupon: own.coupon || s.carts.guest.coupon,
      items: merged.items,
      version: own.version + 1,
    };
    s.carts.guest = {
      items: [],
      coupon: "",
      version: s.carts.guest.version + 1,
    };
    return {
      user: publicUser(user!),
      expiresAt: s.session.expiresAt,
      adjustments: merged.adjustments,
    };
  }
  if (path === "/nfts" && method === "GET") {
    const p = new URL(request.url).searchParams;
    let list = s.scenario === "empty" ? [] : [...s.nfts];
    const q = (p.get("q") ?? "").toLowerCase();
    list = list.filter((n) => n.name.toLowerCase().includes(q));
    for (const [param, field] of [
      ["collections", "collection"],
      ["networks", "network"],
    ] as const) {
      const values = (p.get(param) ?? "").split(",").filter(Boolean);
      if (values.length) list = list.filter((n) => values.includes(n[field]));
    }
    if (p.get("min"))
      list = list.filter((n) => new Decimal(n.price).gte(p.get("min")!));
    if (p.get("max"))
      list = list.filter((n) => new Decimal(n.price).lte(p.get("max")!));
    if (p.get("favorites") === "true") {
      const u = current(s, true)!;
      list = list.filter((n) => (s.favorites[u.id] ?? []).includes(n.id));
    }
    if (p.get("tab") === "new") list = list.filter((n) => Number(n.id) > 9);
    if (p.get("tab") === "trending")
      list = list.filter((n) => Number(n.id) % 2 === 1);
    const sort = p.get("sort");
    if (sort === "price-asc" || sort === "price-desc")
      list.sort(
        (a, b) =>
          new Decimal(a.price).cmp(b.price) * (sort === "price-asc" ? 1 : -1),
      );
    const page = Math.max(1, Number(p.get("page")) || 1);
    return {
      items: list.slice((page - 1) * 9, page * 9),
      total: list.length,
      pages: Math.ceil(list.length / 9),
    };
  }
  if (path.startsWith("/nfts/"))
    return (
      s.nfts.find((n) => n.id === path.split("/")[2]) ??
      fail(404, "NOT_FOUND", "NFT não encontrado.")
    );
  if (path === "/favorites") {
    const u = current(s, true)!;
    const list = s.favorites[u.id] ?? (s.favorites[u.id] = []);
    if (method === "GET") return list;
    if (s.scenario === "favorite-error") {
      s.scenario = "normal";
      fail(
        503,
        "TRANSIENT",
        "Não foi possível salvar o favorito. Tente novamente.",
      );
    }
    const id = validate(z.string(), body.nftId);
    if (!s.nfts.some((n) => n.id === id))
      fail(404, "NOT_FOUND", "NFT não encontrado.");
    s.favorites[u.id] = body.favorite
      ? [...new Set([...list, id])]
      : list.filter((i) => i !== id);
    return s.favorites[u.id];
  }
  if (path === "/cart") {
    const c = cart(s);
    if (method === "POST" || method === "PATCH") {
      const i = validate(
        z.object({
          nftId: z.string(),
          edition: z.enum(["1/1", "1/10", "1/50", "Aberta"]),
          quantity: z.number().int().min(0).max(100),
        }),
        body,
      );
      const n =
        s.nfts.find((n) => n.id === i.nftId) ??
        fail(404, "NOT_FOUND", "NFT não encontrado.");
      const existing = c.items.find(
        (x) => x.nftId === i.nftId && x.edition === i.edition,
      );
      const quantity =
        method === "POST" ? (existing?.quantity ?? 0) + i.quantity : i.quantity;
      if (quantity > n.stock[i.edition])
        fail(
          409,
          "STOCK",
          "Quantidade maior que a disponibilidade desta edição.",
        );
      if (existing) existing.quantity = quantity;
      else if (quantity) c.items.push(i);
      c.items = c.items.filter((i) => i.quantity > 0);
      c.version++;
    }
    return {
      ...c,
      products: s.nfts.filter((n) => c.items.some((i) => i.nftId === n.id)),
    };
  }
  if (path === "/quote") {
    const c = cart(s);
    if (method === "POST" && body.coupon !== undefined) {
      const coupon = validate(z.string(), body.coupon).toUpperCase().trim();
      if (coupon && coupon !== "KURIO10")
        fail(
          422,
          "COUPON",
          coupon === "EXPIROU"
            ? "Este cupom expirou."
            : "Cupom inválido. Use KURIO10.",
        );
      c.coupon = coupon;
      c.version++;
    }
    const q = quote(s);
    s.quotes[q.id] = q;
    return q;
  }
  if (path === "/profile") {
    const u = current(s, true)!;
    if (method === "PATCH") {
      const p = validate(profileSchema, body);
      if (
        s.users.some(
          (other) =>
            other.id !== u.id &&
            (other.email === p.email || other.username === p.username),
        )
      )
        fail(409, "CONFLICT", "E-mail ou nome de usuário já utilizado.");
      Object.assign(u, p);
    }
    return publicUser(u);
  }
  if (path === "/password") {
    const u = current(s, true)!;
    const p = validate(
      z
        .object({ current: z.string(), password, confirm: z.string() })
        .refine((v) => v.password === v.confirm, {
          path: ["confirm"],
          message: "As senhas não coincidem.",
        }),
      body,
    );
    if (u.hash !== (await hashPassword(p.current, u.salt)))
      throw new Failure(422, "VALIDATION", "Senha atual incorreta.", {
        current: "Senha atual incorreta.",
      });
    u.salt = crypto.randomUUID();
    u.hash = await hashPassword(p.password, u.salt);
    return { ok: true };
  }
  if (path === "/wallets") {
    const u = current(s, true)!;
    const list = s.wallets[u.id] ?? (s.wallets[u.id] = []);
    if (method === "POST" || method === "PATCH") {
      const w = validate(walletSchema, body);
      const id = typeof body.id === "string" ? body.id : crypto.randomUUID();
      const index = list.findIndex((w) => w.id === id);
      if (method === "PATCH" && index < 0)
        fail(404, "NOT_FOUND", "Carteira não encontrada.");
      if (index < 0) list.push({ ...w, id });
      else list[index] = { ...w, id };
    }
    return list;
  }
  if (path === "/wallets/connect") {
    const u = current(s, true)!;
    if (s.scenario === "wallet-refused")
      fail(
        409,
        "WALLET_REFUSED",
        "Conexão recusada pela carteira. Tente novamente.",
      );
    if (!s.wallets[u.id]?.some((w) => w.id === body.walletId))
      fail(404, "NOT_FOUND", "Cadastre uma carteira para continuar.");
    return { connected: true };
  }
  if (path === "/orders" && method === "POST") {
    const u = current(s, true)!;
    const key = request.headers.get("Idempotency-Key");
    if (!key) fail(422, "IDEMPOTENCY", "Chave de idempotência obrigatória.");
    const payload = canonical(body);
    const existing = s.orders.find((o) => o.key === key && o.userId === u.id);
    if (existing) {
      if (existing.payload !== payload)
        fail(409, "IDEMPOTENCY", "Esta chave já foi usada com outro conteúdo.");
      return existing;
    }
    const input = validate(
      z.object({
        quoteId: z.string(),
        walletId: z.string(),
        collector: z.record(z.string(), z.string()),
      }),
      body,
    );
    validate(
      z.object({
        name: text,
        username: text,
        email,
        profile: text,
        referral: text,
        ens: z.string(),
      }),
      input.collector,
    );
    const q = s.quotes[input.quoteId];
    if (
      !q ||
      q.expiresAt < Date.now() ||
      q.fingerprint !== quote(s).fingerprint
    )
      fail(
        409,
        "QUOTE_CHANGED",
        "Os valores ou a disponibilidade mudaram. Revise a nova cotação.",
      );
    if (!q.items.length) fail(422, "EMPTY_CART", "Seu carrinho está vazio.");
    const w =
      s.wallets[u.id]?.find((w) => w.id === input.walletId) ??
      fail(422, "WALLET", "Selecione uma carteira cadastrada.");
    if (q.networks.length !== 1 || q.networks[0] !== w.network)
      fail(
        409,
        "NETWORK",
        "A rede da carteira deve ser a mesma de todos os NFTs.",
      );
    for (const item of q.items) {
      const nft = s.nfts.find((n) => n.id === item.nftId)!;
      nft.stock[item.edition] -= item.quantity;
      nft.version++;
      emit("nft.updated", nft);
    }
    const o: Order = {
      id: crypto.randomUUID(),
      userId: u.id,
      key: key!,
      payload,
      status: "pending",
      version: 1,
      quote: structuredClone(q),
      wallet: structuredClone(w),
      collector: input.collector,
      createdAt: Date.now(),
      settlesAt: Date.now() + 3000,
      outcome: s.scenario === "declined" ? "declined" : "confirmed",
      transaction: `0x${crypto.randomUUID().replaceAll("-", "")}`,
      consumed: false,
    };
    s.orders.push(o);
    setTimeout(() => void transaction((state) => settle(state)), 3100);
    return o;
  }
  if (path === "/orders/by-key") {
    const u = current(s, true)!;
    return (
      s.orders.find(
        (o) =>
          o.key === new URL(request.url).searchParams.get("key") &&
          o.userId === u.id,
      ) ??
      fail(
        404,
        "NOT_FOUND",
        "Tentativa ainda não encontrada. Reenvie com a mesma chave.",
      )
    );
  }
  if (path.startsWith("/orders/")) {
    const u = current(s, true)!;
    const o =
      s.orders.find((o) => o.id === path.split("/")[2]) ??
      fail(404, "NOT_FOUND", "Pedido não encontrado.");
    if (o.userId !== u.id)
      fail(403, "FORBIDDEN", "Este pedido pertence a outra conta.");
    return o;
  }
  fail(404, "NOT_FOUND", "Recurso não encontrado.");
}
const handler = http.all("/api/*", async ({ request }) => {
  const path = new URL(request.url).pathname.slice(4);
  let body: Record<string, unknown> = {};
  if (!["GET", "HEAD", "DELETE"].includes(request.method)) {
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return HttpResponse.json(
        { code: "VALIDATION", message: "JSON inválido." },
        { status: 400 },
      );
    }
  }
  const scenario = await transaction((s) => s.scenario);
  if (path !== "/demo") {
    await delay(
      scenario === "slow"
        ? 1800
        : scenario === "variable"
          ? (new URL(request.url).searchParams.get("q")?.length ?? 0) % 2
            ? 900
            : 150
          : 40,
    );
    if (scenario === "offline") return HttpResponse.error();
    if (scenario === "server-error")
      return HttpResponse.json(
        { code: "TRANSIENT", message: "Serviço temporariamente indisponível." },
        { status: 503 },
      );
  }
  const result = await transaction(async (s) => {
    try {
      return { data: await route(s, request, path, body), status: 200 };
    } catch (error) {
      if (error instanceof Failure)
        return {
          data: {
            code: error.code,
            message: error.message,
            fields: error.fields,
          },
          status: error.status,
        };
      console.error(error);
      return {
        data: { code: "INTERNAL", message: "Erro na simulação." },
        status: 500,
      };
    }
  });
  if (path === "/orders" && scenario === "timeout" && result.status === 200)
    await delay(12000);
  return new HttpResponse(JSON.stringify(result.data), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
});
export const worker = setupWorker(
  handler,
  socket.addEventListener("connection", (connection) => {
    if (!connected) {
      connection.client.close();
      return;
    }
    const peer = toSocketIo(connection);
    peers.add(peer);
    // Heartbeat mínimo do Engine.IO: responde "2" (ping) com "3" (pong).
    const ping = setInterval(() => connection.client.send("2"), 20000);
    connection.client.addEventListener("message", (event) => {
      if (event.data === "2") connection.client.send("3");
    });
    connection.client.addEventListener("close", () => {
      clearInterval(ping);
      peers.delete(peer);
    });
  }),
);
