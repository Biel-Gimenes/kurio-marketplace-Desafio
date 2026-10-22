import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { add, api, checkout, demo, login, ready } from "./helpers";
import type { Order, Quote } from "../src/contracts";
test("1. busca, filtros combinados, ordenação, página e histórico", async ({
  page,
  isMobile,
}) => {
  await ready(page);
  await page
    .getByRole("textbox", { name: "Buscar NFTs", exact: true })
    .fill("Nomad");
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(8);
  if (isMobile)
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
  const scope = isMobile
    ? page.getByRole("dialog")
    : page.locator(".catalog-sidebar");
  await scope.getByLabel("Arte digital", { exact: true }).check();
  await scope.getByLabel("Ethereum", { exact: true }).check();
  if (isMobile)
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Buscar NFTs", exact: true }),
  ).toHaveValue("Nomad");
  await page.goto("/?sort=price-asc&page=2");
  await expect(page.locator(".pagination [aria-current=page]")).toHaveText("2");
  await page.goto("/?sort=price-desc");
  await expect(page.locator(".nft-price").first()).toContainText("1.99");
  await page.goBack();
  await expect(page.locator(".pagination [aria-current=page]")).toHaveText("2");
});
test("2. detalhe direto, inexistente e edição esgotada", async ({ page }) => {
  await ready(page);
  await page.goto("/nfts/1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await page.getByLabel("1/1", { exact: true }).check();
  await expect(
    page.getByRole("button", { name: "Aumentar quantidade", exact: true }),
  ).toBeDisabled();
  await demo(page, { action: "stock" });
  await expect(
    page.getByRole("button", { name: "COMPRAR", exact: true }),
  ).toBeDisabled();
  await page.goto("/nfts/inexistente");
  await expect(
    page.getByText("NFT não encontrado.", { exact: true }),
  ).toBeVisible();
  await page.goto("/nao-existe");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});
test("3. cadastro, conflito, sessão, logout, isolamento e expiração", async ({
  page,
}) => {
  await ready(page);
  await page.goto("/cadastro?returnTo=/perfil");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome de exibição").fill("Ana Silva");
  await dialog.getByLabel("Nome de usuário").fill("ana");
  await dialog.getByLabel("E-mail", { exact: true }).fill("nova@kurio.art");
  await dialog.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await dialog.getByLabel("Confirmar senha", { exact: true }).fill("Kurio123!");
  await dialog
    .getByRole("button", { name: "Criar conta", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("já está cadastrado");
  await dialog.getByLabel("E-mail", { exact: true }).fill("ana@kurio.art");
  await dialog
    .getByRole("button", { name: "Criar conta", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Perfil do colecionador", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Ana Silva");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page);
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Nova Sato");
  await demo(page, { scenario: "expired" });
  await page.goto("/carteiras");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/login/);
});
test("4. favoritos otimistas com rollback e persistência", async ({ page }) => {
  await ready(page);
  await login(page, "nova@kurio.art", "/");
  await demo(page, { scenario: "favorite-error" });
  const favorite = page.getByRole("button", {
    name: "Adicionar Emerald Ape #042 aos favoritos",
    exact: true,
  });
  await favorite.click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Não foi possível salvar o favorito" }),
  ).toBeVisible();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await favorite.click();
  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
      exact: true,
    }),
  ).toBeEnabled();
  await page.goto("/favoritos");
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(1);
});
test("5. carrinho, quantidade, cupom, refresh, fusão e remoção", async ({
  page,
}) => {
  await ready(page);
  await add(page);
  await page
    .getByRole("button", { name: "Aumentar quantidade", exact: true })
    .click();
  await expect(page.locator(".cart-line-total")).toHaveText("2.38 ETH");
  await page.getByLabel("Código promocional").fill("EXPIROU");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("expirou");
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.locator(".grand-total dd")).toHaveText("2.158 ETH");
  await page.reload();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await login(page, "nova@kurio.art", "/carrinho");
  await expect(page.locator(".cart-line-total")).toHaveText("2.38 ETH");
  await page.reload();
  await expect(page.locator(".cart-line-total")).toHaveText("2.38 ETH");
  await page
    .getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("6. compra completa e recibo imutável após refresh", async ({ page }) => {
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByText("Pedido confirmado", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".receipt .grand-total dd")).toHaveText(
    "1.206 ETH",
  );
  await demo(page, { action: "price" });
  await page.reload();
  await expect(
    page.getByText("Pedido confirmado", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".receipt .grand-total dd")).toHaveText(
    "1.206 ETH",
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("7. pagamento recusado preserva itens", async ({ page }) => {
  await checkout(page);
  await demo(page, { scenario: "declined" });
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
  await expect(page.locator(".cart-row")).toHaveCount(1);
});
test("7b. timeout e cliques repetidos recuperam a mesma tentativa", async ({
  page,
}) => {
  await checkout(page);
  await demo(page, { scenario: "timeout" });
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .dblclick();
  await expect(page).toHaveURL(/pedidos\//);
  const url = page.url();
  await page.reload();
  await expect(
    page.getByText("Pedido confirmado", { exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
});
test("8. perfil, avatar, senha e carteiras com validações", async ({
  page,
}) => {
  await ready(page);
  await login(page);
  await page
    .getByLabel("Nome de exibição", { exact: true })
    .fill("Nova Editada");
  await page
    .getByLabel("Avatar", { exact: true })
    .setInputFiles("public/assets/emerald.webp");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  await page.reload();
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Nova Editada");
  await expect(page.getByAltText("Seu avatar")).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("errada");
  await page.getByLabel("Nova senha", { exact: true }).fill("Nova12345!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("Nova12345!");
  await page.getByRole("button", { name: "Salvar senha", exact: true }).click();
  await expect(
    page.getByText("Senha atual incorreta.", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Salvar senha", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Senha alterada");
  await page.goto("/carteiras");
  const wallet = page.locator(".wallet-form").first();
  await wallet
    .getByLabel("Endereço da carteira", { exact: true })
    .fill("invalido");
  await wallet
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await expect(wallet.getByRole("alert")).toContainText("Endereço inválido");
  await wallet
    .getByLabel("Endereço da carteira", { exact: true })
    .fill("0x1111111111111111111111111111111111111111");
  await wallet
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Carteira salva");
  await page.reload();
  await expect(
    page
      .locator(".wallet-form")
      .first()
      .getByLabel("Endereço da carteira", { exact: true }),
  ).toHaveValue("0x1111111111111111111111111111111111111111");
});
test("9. preço muda via Socket.IO e exige nova confirmação", async ({
  page,
}) => {
  await checkout(page);
  await expect(page.locator(".connection-on")).toBeVisible();
  await demo(page, { action: "price" });
  await expect(
    page.getByRole("status").filter({ hasText: "tempo real" }),
  ).toBeVisible();
  await expect(
    page.locator(".checkout-summary>.totals .grand-total dd"),
  ).toHaveText("1.306 ETH");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/checkout/);
  await expect(page.locator(".review-box")).toContainText("1.306 ETH");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByText("Pedido confirmado", { exact: true }),
  ).toBeVisible();
});
test("10. duplicatas, evento antigo, desconexão e retomada pendente", async ({
  page,
}) => {
  await checkout(page);
  await demo(page, { action: "price" });
  await expect(
    page.locator(".checkout-summary>.totals .grand-total dd"),
  ).toHaveText("1.306 ETH");
  await demo(page, { action: "duplicate" });
  await demo(page, { action: "stale" });
  await expect(
    page.locator(".checkout-summary>.totals .grand-total dd"),
  ).toHaveText("1.306 ETH");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/pedidos\//);
  await demo(page, { action: "disconnect" });
  await expect(page.locator(".connection-off")).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Pedido confirmado", { exact: true }),
  ).toBeVisible();
});
test("11. teclado, foco, validação e axe", async ({ page }) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Abrir painel de demonstração" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir painel de demonstração" }),
  ).toBeFocused();
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("E-mail", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
});
test("12. skeletons, falha REST e recuperação", async ({ page }) => {
  await ready(page);
  await demo(page, { scenario: "slow" });
  await page.goto("/nfts/1");
  await expect(
    page.getByLabel("Carregando detalhe", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await demo(page, { scenario: "server-error" });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Não foi possível carregar" }),
  ).toBeVisible();
  await demo(page, { scenario: "normal" });
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
});
test("contrato: autorização, idempotência e conflito de conteúdo", async ({
  page,
}) => {
  await ready(page);
  await add(page);
  await api(page, "/login", { email: "nova@kurio.art", password: "Kurio123!" });
  const q = await api<Quote>(page, "/quote");
  const body = {
    quoteId: q.id,
    walletId: "u1-main",
    collector: {
      name: "Nova",
      username: "nova",
      profile: "Nova",
      email: "nova@kurio.art",
      referral: "KURIO",
      ens: "nova.eth",
    },
  };
  const headers = { "Idempotency-Key": "same-attempt" };
  const first = await api<Order>(page, "/orders", body, "POST", headers);
  const second = await api<Order>(page, "/orders", body, "POST", headers);
  expect(first.id).toBe(second.id);
  const conflict = await api<{ code: string }>(
    page,
    "/orders",
    { ...body, walletId: "u1-secondary" },
    "POST",
    headers,
  );
  expect(conflict.code).toBe("IDEMPOTENCY");
  await api(page, "/session", undefined, "DELETE");
  await api(page, "/login", { email: "leo@kurio.art", password: "Kurio123!" });
  const forbidden = await api<{ code: string }>(page, `/orders/${first.id}`);
  expect(forbidden.code).toBe("FORBIDDEN");
});
test("relógio controlado: confirmação consome apenas quantidades compradas", async ({
  page,
}) => {
  await ready(page);
  await add(page);
  await api(page, "/login", { email: "nova@kurio.art", password: "Kurio123!" });
  await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
  const q = await api<Quote>(page, "/quote");
  const body = {
    quoteId: q.id,
    walletId: "u1-main",
    collector: {
      name: "Nova",
      username: "nova",
      profile: "Nova",
      email: "nova@kurio.art",
      referral: "KURIO",
      ens: "nova.eth",
    },
  };
  const o = await api<Order>(page, "/orders", body, "POST", {
    "Idempotency-Key": "controlled-time",
  });
  await api(
    page,
    "/cart",
    { nftId: "1", edition: "1/50", quantity: 2 },
    "PATCH",
  );
  await page.clock.fastForward(3200);
  const confirmed = await api<Order>(page, `/orders/${o.id}`);
  expect(confirmed.status).toBe("confirmed");
  const repeat = await api<Order>(page, "/orders", body, "POST", {
    "Idempotency-Key": "controlled-time",
  });
  expect(repeat.id).toBe(o.id);
  const cart = await api<{ items: { quantity: number }[] }>(page, "/cart");
  expect(cart.items[0].quantity).toBe(1);
});
test("sessão expirada no checkout preserva o rascunho e o carrinho", async ({
  page,
}) => {
  await checkout(page);
  await page
    .getByRole("textbox", { name: "Nome de exibição", exact: true })
    .fill("Nova do Checkout");
  await page
    .getByLabel("Observação do colecionador (opcional)")
    .fill("Meu primeiro NFT");
  await demo(page, { scenario: "expired" });
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  const d = page.getByRole("dialog");
  await d.getByLabel("E-mail", { exact: true }).fill("nova@kurio.art");
  await d.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await d.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/checkout/);
  await expect(
    page.getByRole("textbox", { name: "Nome de exibição", exact: true }),
  ).toHaveValue("Nova do Checkout");
  await expect(
    page.getByLabel("Observação do colecionador (opcional)"),
  ).toHaveValue("Meu primeiro NFT");
  await expect(page.locator(".quote-item")).toHaveCount(1);
});
