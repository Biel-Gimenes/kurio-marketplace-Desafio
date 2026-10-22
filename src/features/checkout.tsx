import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Decimal from "decimal.js";
import axios from "axios";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Trash2,
  Wallet as WalletIcon,
  XCircle,
} from "lucide-react";
import {
  errorMessage,
  http,
  queryClient,
  useCart,
  useCartMutation,
  useOrder,
  useProfile,
  useQuote,
  useSession,
  useWallets,
} from "../api";
import type { Order, Quote } from "../contracts";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/dialog";
import {
  Breadcrumb,
  Empty,
  ErrorState,
  Loading,
  Quantity,
} from "../components/common";
import { Field, FormError } from "../components/forms";
import { useApp } from "../components/app-context";
import { Recommendations } from "./catalog";
function QuoteTotals({ quote }: { quote: Quote }) {
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{quote.subtotal} ETH</dd>
      </div>
      <div>
        <dt>Desconto do lançamento</dt>
        <dd>(−) {quote.discount} ETH</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>
          {quote.fee} ETH<small>Taxa estimada</small>
        </dd>
      </div>
      <div className="grand-total">
        <dt>Total</dt>
        <dd>{quote.total} ETH</dd>
      </div>
    </dl>
  );
}
function QuoteItems({ quote }: { quote: Quote }) {
  return (
    <div className="quote-items">
      {quote.items.map((i) => (
        <div className="quote-item" key={`${i.nftId}:${i.edition}`}>
          <img src={i.image} alt="" width="70" height="70" />
          <div>
            <b>{i.name}</b>
            <small>
              Edição: {i.edition} (× {i.quantity})
            </small>
          </div>
          <strong>
            {new Decimal(i.price).times(i.quantity).toFixed()} ETH
          </strong>
        </div>
      ))}
    </div>
  );
}
export function CartPage() {
  const c = useCart();
  const quote = useQuote();
  const mutation = useCartMutation();
  const { notify } = useApp();
  const [coupon, setCoupon] = useState("");
  const couponMutation = useMutation({
    mutationFn: async (code: string) =>
      (await http.post<Quote>("/quote", { coupon: code })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      await queryClient.invalidateQueries({ queryKey: ["quote"] });
      notify("Cupom atualizado.");
    },
  });
  return (
    <>
      <Breadcrumb>Mercado / Carrinho</Breadcrumb>
      <h1 className="mobile-page-title">Meu carrinho</h1>
      {c.isPending ? (
        <Loading cards={3} />
      ) : c.isError ? (
        <ErrorState error={c.error} retry={() => void c.refetch()} />
      ) : !c.data.items.length ? (
        <Empty title="Seu carrinho está vazio">
          <p>Encontre uma obra para começar sua coleção.</p>
          <Button asChild>
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </Empty>
      ) : (
        <div className="cart-layout">
          <section aria-label="Itens do carrinho">
            <div className="cart-table-head">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            {c.data.items.map((item) => {
              const n = c.data.products.find((p) => p.id === item.nftId)!;
              return (
                <article
                  className="cart-row"
                  key={`${item.nftId}:${item.edition}`}
                >
                  <Link
                    className="cart-nft"
                    to="/nfts/$nftId"
                    params={{ nftId: n.id }}
                  >
                    <img src={n.image} alt={n.name} width="80" height="80" />
                    <div>
                      <b>{n.name}</b>
                      <small>Edição: {item.edition}</small>
                    </div>
                  </Link>
                  <span className="cart-price">{n.price} ETH</span>
                  <Quantity
                    value={item.quantity}
                    max={n.stock[item.edition]}
                    disabled={mutation.isPending}
                    onChange={(quantity) =>
                      mutation.mutate(
                        { item: { ...item, quantity } },
                        { onError: (e) => notify(errorMessage(e)) },
                      )
                    }
                  />
                  <strong className="cart-line-total">
                    {new Decimal(n.price).times(item.quantity).toFixed()} ETH
                  </strong>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${n.name}`}
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate(
                        { item: { ...item, quantity: 0 } },
                        { onError: (e) => notify(errorMessage(e)) },
                      )
                    }
                  >
                    <Trash2 size={19} />
                  </Button>
                  {n.stock[item.edition] < item.quantity && (
                    <p className="field-error">
                      Quantidade indisponível. Remova ou ajuste a edição.
                    </p>
                  )}
                </article>
              );
            })}
          </section>
          <aside className="cart-summary">
            <h2>Resumo da carteira</h2>
            <form
              className="coupon-form"
              onSubmit={(e) => {
                e.preventDefault();
                couponMutation.mutate(coupon);
              }}
            >
              <label htmlFor="coupon-code">Código promocional</label>
              <div>
                <input
                  id="coupon-code"
                  placeholder="Digite o código promocional..."
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <Button disabled={couponMutation.isPending} size="sm">
                  Aplicar
                </Button>
              </div>
            </form>
            {couponMutation.isError && (
              <p role="alert" className="form-error">
                {errorMessage(couponMutation.error)}
              </p>
            )}
            {quote.data?.coupon && (
              <p className="coupon-applied">
                {quote.data.coupon} aplicado{" "}
                <button onClick={() => couponMutation.mutate("")}>
                  Remover cupom
                </button>
              </p>
            )}
            {quote.isPending ? (
              <Loading cards={1} />
            ) : quote.isError ? (
              <ErrorState
                error={quote.error}
                retry={() => void quote.refetch()}
              />
            ) : (
              <QuoteTotals quote={quote.data} />
            )}
            <Button
              className="w-full"
              asChild={!!quote.data && !quote.isError}
              disabled={!quote.data || quote.isError}
            >
              {quote.data && !quote.isError ? (
                <Link to="/checkout">Conectar e finalizar</Link>
              ) : (
                "Ajuste o carrinho para continuar"
              )}
            </Button>
            <Link className="continue-link" to="/">
              Continuar explorando
            </Link>
          </aside>
        </div>
      )}
      <Recommendations title="Colecionadores também viram" />
    </>
  );
}
const collectorSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  username: z.string().min(2, "Informe seu usuário."),
  email: z.email("Informe um e-mail válido."),
  profile: z.string().min(2, "Informe o nome do perfil."),
  referral: z.string().min(2, "Informe o código de indicação."),
  ens: z.string(),
  notes: z.string(),
});
type Collector = z.infer<typeof collectorSchema>;
type Attempt = {
  key: string;
  userId: string;
  body: { quoteId: string; walletId: string; collector: Collector };
};
export function Checkout() {
  const session = useSession();
  const profile = useProfile();
  const wallets = useWallets();
  const quote = useQuote();
  const navigate = useNavigate();
  const { notify } = useApp();
  const [walletId, setWalletId] = useState("");
  const [connectedWallet, setConnectedWallet] = useState("");
  const [review, setReview] = useState<Quote | null>(null);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [recoverChecked, setRecoverChecked] = useState(false);
  const uid = session.data?.user?.id ?? "";
  const form = useForm<Collector>({
    resolver: zodResolver(collectorSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      profile: "",
      referral: "KURIO",
      ens: "",
      notes: "",
    },
  });
  useEffect(() => {
    if (!profile.data) return;
    let draft: Partial<Collector> = {};
    try {
      const saved = z
        .record(z.string(), z.string())
        .safeParse(
          JSON.parse(sessionStorage.getItem(`kurio-draft:${uid}`) ?? "{}"),
        );
      if (saved.success) draft = saved.data;
    } catch {
      /* An invalid local draft is ignored. */
    }
    form.reset({
      name: profile.data.name,
      username: profile.data.username,
      email: profile.data.email,
      profile: profile.data.name,
      referral: "KURIO",
      ens: profile.data.ens,
      notes: "",
      ...draft,
    });
  }, [profile.data, form, uid]);
  useEffect(() => {
    if (!uid) return;
    const subscription = form.watch((values) =>
      sessionStorage.setItem(`kurio-draft:${uid}`, JSON.stringify(values)),
    );
    return () => subscription.unsubscribe();
  }, [uid, form]);
  useEffect(() => {
    if (!walletId && wallets.data?.length) setWalletId(wallets.data[0].id);
  }, [wallets.data, walletId]);
  useEffect(() => {
    if (!uid || recoverChecked) return;
    setRecoverChecked(true);
    try {
      // Uma tentativa anterior pode ter criado o pedido e perdido a resposta.
      // Antes de deixar o usuário comprar de novo, procuramos pela mesma chave.
      const saved = JSON.parse(
        localStorage.getItem(`kurio-attempt:${uid}`) ?? "null",
      ) as Attempt | null;
      if (saved?.userId === uid) {
        setAttempt(saved);
        void http
          .get<Order>("/orders/by-key", { params: { key: saved.key } })
          .then(({ data }) => {
            void navigate({
              to: "/pedidos/$orderId",
              params: { orderId: data.id },
            });
          })
          .catch(() =>
            setError(
              "Há uma tentativa salva. Recupere o pedido antes de tentar novamente.",
            ),
          );
      }
    } catch {
      localStorage.removeItem(`kurio-attempt:${uid}`);
    }
  }, [uid, recoverChecked, navigate]);
  const connect = useMutation({
    mutationFn: async () => http.post("/wallets/connect", { walletId }),
    onSuccess: () => {
      setConnectedWallet(walletId);
      notify("Carteira conectada na simulação.");
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const selected = wallets.data?.find((w) => w.id === walletId);
  const incompatible =
    !!quote.data &&
    (quote.data.networks.length !== 1 ||
      quote.data.networks[0] !== selected?.network);
  const submit = async (collector: Collector) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (attempt) {
        await recover(attempt);
        return;
      }
      if (connectedWallet !== walletId) {
        setError("Conecte a carteira selecionada antes de continuar.");
        return;
      }
      if (incompatible) {
        setError(
          "A rede da carteira deve corresponder a todos os NFTs. Ajuste o carrinho ou selecione outra carteira.",
        );
        return;
      }
      const fresh = (await http.get<Quote>("/quote")).data;
      if (!review) {
        setReview(fresh);
        setChanged(false);
        return;
      }
      if (review.fingerprint !== fresh.fingerprint) {
        setReview(fresh);
        setChanged(true);
        notify(
          "Cotação alterada. Confira os novos valores e confirme novamente.",
        );
        return;
      }
      const next: Attempt = {
        key: crypto.randomUUID(),
        userId: uid,
        body: { quoteId: fresh.id, walletId, collector },
      };
      localStorage.setItem(`kurio-attempt:${uid}`, JSON.stringify(next));
      setAttempt(next);
      await recover(next);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const recover = async (saved: Attempt) => {
    let order: Order;
    try {
      order = (
        await http.post<Order>("/orders", saved.body, {
          headers: { "Idempotency-Key": saved.key },
          timeout: 1800,
        })
      ).data;
    } catch (e) {
      try {
        order = (
          await http.get<Order>("/orders/by-key", {
            params: { key: saved.key },
          })
        ).data;
      } catch {
        if (
          axios.isAxiosError(e) &&
          e.response &&
          [409, 422].includes(e.response.status)
        ) {
          localStorage.removeItem(`kurio-attempt:${uid}`);
          setAttempt(null);
          setReview(null);
          await queryClient.invalidateQueries({ queryKey: ["quote"] });
        }
        throw e;
      }
    }
    await navigate({ to: "/pedidos/$orderId", params: { orderId: order.id } });
  };
  const reviewChanged =
    !!review && !!quote.data && review.fingerprint !== quote.data.fingerprint;
  if (profile.isPending || wallets.isPending || quote.isPending)
    return <Loading cards={2} />;
  if (profile.isError || wallets.isError)
    return (
      <ErrorState
        error={profile.error ?? wallets.error}
        retry={() => {
          void profile.refetch();
          void wallets.refetch();
        }}
      />
    );
  if (quote.data && !quote.data.items.length && !attempt)
    return (
      <Empty title="Seu carrinho está vazio">
        <Button asChild>
          <Link to="/">Explorar NFTs</Link>
        </Button>
      </Empty>
    );
  return (
    <>
      <Breadcrumb>Mercado / Pagamento</Breadcrumb>
      <div className="checkout-layout">
        <section>
          <h1>Perfil do colecionador</h1>
          <form
            id="checkout-form"
            onSubmit={form.handleSubmit(submit)}
            noValidate
          >
            <div className="form-grid">
              <Field
                form={form}
                name="name"
                label="Nome de exibição"
                required
              />
              <Field
                form={form}
                name="username"
                label="Nome de usuário"
                required
              />
              <div className="form-field">
                <label>Rede</label>
                <input
                  aria-label="Rede da carteira"
                  value={selected?.network ?? ""}
                  readOnly
                />
              </div>
              <Field
                form={form}
                name="profile"
                label="Nome do perfil"
                required
              />
              <div className="form-field">
                <label htmlFor="wallet-address">Endereço da carteira</label>
                <input
                  id="wallet-address"
                  value={selected?.address ?? ""}
                  readOnly
                />
              </div>
              <Field form={form} name="ens" label="Nome ENS" />
              <div className="form-field">
                <label htmlFor="wallet-provider">Tipo de carteira</label>
                <input
                  id="wallet-provider"
                  value={selected?.provider ?? ""}
                  readOnly
                />
              </div>
              <Field
                form={form}
                name="referral"
                label="Código de indicação"
                required
              />
              <Field
                form={form}
                name="email"
                label="E-mail"
                type="email"
                required
              />
            </div>
            <label className="notes-label" htmlFor="collector-notes">
              Observação do colecionador (opcional)
            </label>
            <textarea
              id="collector-notes"
              {...form.register("notes")}
              rows={5}
            />
            <FormError form={form} />
          </form>
        </section>
        <aside className="checkout-summary">
          <h2>Seus NFTs</h2>
          {quote.isError ? (
            <ErrorState
              error={quote.error}
              retry={() => void quote.refetch()}
            />
          ) : (
            quote.data && (
              <>
                <QuoteItems quote={quote.data} />
                <QuoteTotals quote={quote.data} />
              </>
            )
          )}
          <fieldset className="wallet-options">
            <legend>Carteira e rede</legend>
            {wallets.data.map((wallet) => (
              <label
                key={wallet.id}
                className={wallet.id === walletId ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="wallet"
                  checked={wallet.id === walletId}
                  onChange={() => {
                    setWalletId(wallet.id);
                    setConnectedWallet("");
                    setReview(null);
                  }}
                />
                <WalletIcon size={21} />
                <span>
                  <b>
                    {wallet.name} · {wallet.provider}
                  </b>
                  <small>
                    {wallet.address.slice(0, 10)}…{wallet.address.slice(-4)} ·{" "}
                    {wallet.network}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          {!wallets.data.length && (
            <p>
              Você ainda não cadastrou uma carteira.{" "}
              <Link to="/carteiras" className="text-link">
                Cadastrar carteira
              </Link>
            </p>
          )}
          {connectedWallet === walletId && walletId ? (
            <div className="wallet-connected">
              <ShieldCheck size={17} /> Carteira conectada{" "}
              <button onClick={() => setConnectedWallet("")}>
                Desconectar
              </button>
            </div>
          ) : (
            <Button
              className="w-full"
              variant="outline"
              disabled={!walletId || connect.isPending}
              onClick={() => connect.mutate()}
            >
              {connect.isPending ? "Conectando…" : "Conectar carteira"}
            </Button>
          )}
          {incompatible && (
            <p className="form-error" role="alert">
              Rede incompatível. Use uma carteira na mesma rede dos NFTs.
              Carrinhos com redes diferentes precisam ser ajustados.
            </p>
          )}
          {review && (
            <div className="review-box">
              <h2>Revise sua compra</h2>
              <p>
                {form.getValues("name")} · {selected?.network}
              </p>
              <p>
                {review.items.reduce((s, i) => s + i.quantity, 0)} edição(ões) ·{" "}
                <b>{review.total} ETH</b>
              </p>
              {(changed || reviewChanged) && (
                <p role="alert">
                  A cotação mudou. Confira os valores atualizados e confirme
                  novamente.
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={() => setReview(null)}>
                Editar dados
              </Button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="w-full checkout-submit"
            type="submit"
            form="checkout-form"
            disabled={
              busy ||
              (!attempt && (quote.isError || !connectedWallet || incompatible))
            }
          >
            {busy
              ? "Processando…"
              : attempt
                ? "Recuperar tentativa"
                : review
                  ? "Confirmar compra"
                  : "Revisar compra"}
          </Button>
          <p className="simulation-note">
            Carteira e pagamento simulados. Nenhuma cobrança real.
          </p>
        </aside>
      </div>
    </>
  );
}
export function OrderPage() {
  const { orderId } = useParams({ strict: false });
  const { connected, notify } = useApp();
  const order = useOrder(orderId ?? "", connected);
  const navigate = useNavigate();
  useEffect(() => {
    if (order.data && order.data.status !== "pending") {
      localStorage.removeItem(`kurio-attempt:${order.data.userId}`);
      if (order.data.status === "confirmed")
        sessionStorage.removeItem(`kurio-draft:${order.data.userId}`);
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  }, [order.data]);
  if (order.isPending) return <Loading cards={1} />;
  if (order.isError)
    return (
      <ErrorState error={order.error} retry={() => void order.refetch()} />
    );
  const o = order.data;
  const content = (
    <Receipt
      order={o}
      onExplore={() =>
        notify(
          "Referência de transação simulada. Não existe uma transação real em exploradores de blockchain.",
        )
      }
    />
  );
  return (
    <>
      <Breadcrumb>Pedido {o.id.slice(0, 8)}</Breadcrumb>
      {o.status === "pending" ? (
        <div className="order-state" role="status">
          <Clock size={56} />
          <h1>Seu pedido está sendo processado</h1>
          <p>Aguardando o resultado do pagamento simulado.</p>
          <p>Pedido #{o.id.slice(0, 8)}</p>
          <p>
            {connected
              ? "Acompanhando em tempo real."
              : "Conexão interrompida. Consultando o pedido pela API."}
          </p>
          <p>Você pode recarregar esta página sem criar outra compra.</p>
        </div>
      ) : o.status === "declined" ? (
        <div className="order-state">
          <XCircle size={56} />
          <h1>Pagamento recusado</h1>
          <p>
            Seu carrinho foi preservado. Ajuste o cenário e tente novamente.
          </p>
          <Button asChild>
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        </div>
      ) : (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v) void navigate({ to: "/" });
          }}
          title="Seus NFTs agora estão na sua carteira"
          className="receipt-dialog"
        >
          {content}
        </Dialog>
      )}
    </>
  );
}
function Receipt({
  order: o,
  onExplore,
}: {
  order: Order;
  onExplore: () => void;
}) {
  return (
    <div className="receipt">
      <CheckCircle2 className="receipt-icon" size={58} />
      <p className="receipt-success" role="status">
        Pedido confirmado
      </p>
      <div className="receipt-meta">
        <div>
          ID da transação
          <strong title={o.transaction}>
            {o.transaction.slice(0, 8)}…{o.transaction.slice(-4)}
          </strong>
        </div>
        <div>
          Data
          <strong>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</strong>
        </div>
        <div>
          Carteira<strong>{o.wallet.provider}</strong>
        </div>
      </div>
      <h2>Detalhes da transação</h2>
      <p className="muted">Pedido #{o.id.slice(0, 8)}</p>
      <QuoteItems quote={o.quote} />
      <QuoteTotals quote={o.quote} />
      <p className="muted">
        Transação confirmada na simulação da rede {o.wallet.network}. Este
        recibo preserva os valores da compra.
      </p>
      <Button onClick={onExplore}>Ver referência simulada</Button>
      <Link className="continue-link" to="/">
        Continuar colecionando
      </Link>
    </div>
  );
}
