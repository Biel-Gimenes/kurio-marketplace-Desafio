import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base =
  process.env.PUBLIC_URL ??
  "https://temporary-spry-magnolia-70v5of3.vercel.app";
const dir = "docs/reports";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.tracing.start({
  screenshots: true,
  snapshots: true,
  sources: true,
});
const page = await context.newPage();
const errors = [];
const responses = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (response) => {
  if (response.url().includes("/api/"))
    responses.push({
      url: response.url(),
      status: response.status(),
      serviceWorker: response.fromServiceWorker(),
    });
});
try {
  await page.goto(base + "/nfts/1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".connection-on")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "COMPRAR", exact: true }).click();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.locator(".grand-total dd")).toHaveText("1.087 ETH");
  await page
    .getByRole("link", { name: "Conectar e finalizar", exact: true })
    .click();
  const auth = page.getByRole("dialog");
  await auth.getByLabel("E-mail", { exact: true }).fill("nova@kurio.art");
  await auth.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await auth.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/checkout/);
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await expect(page.locator(".review-box")).toContainText("1.087 ETH");
  await page
    .getByRole("button", { name: "Abrir painel de demonstração" })
    .click();
  await page
    .getByRole("button", { name: "Aumentar preço", exact: true })
    .click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(
    page.locator(".checkout-summary>.totals .grand-total dd"),
  ).toHaveText("1.177 ETH");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/checkout/);
  await expect(page.locator(".review-box")).toContainText("1.177 ETH");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByText("Pedido confirmado", { exact: true }),
  ).toBeVisible();
  const orderUrl = page.url();
  await page.reload();
  await expect(
    page.getByText("Pedido confirmado", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".receipt .grand-total dd")).toHaveText(
    "1.177 ETH",
  );
  await page.screenshot({ path: `${dir}/public-confirmation.png` });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.goto(base + "/carrinho");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobile.newPage();
  await mp.goto(base);
  await expect(mp.locator(".nft-grid .nft-card")).toHaveCount(9);
  await expect(mp.locator(".connection-on")).toBeVisible();
  expect(
    await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await mp.evaluate(async () => {
    for (const image of document.images) image.loading = "eager";
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    );
  });
  await mp.screenshot({ path: `${dir}/public-mobile.png`, fullPage: true });
  await mobile.close();
  expect(errors).toEqual([]);
  await writeFile(
    `${dir}/public-smoke.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        base,
        orderUrl,
        result: "passed",
        checks: [
          "direct detail",
          "refresh detail",
          "cart",
          "coupon",
          "login return",
          "wallet",
          "review",
          "Socket.IO price event via demo UI",
          "quote changed requires confirmation",
          "confirmed order",
          "refresh receipt",
          "cart consumed once",
          "mobile catalog",
          "mobile overflow",
          "mobile socket",
        ],
        pageErrors: errors,
        responses,
      },
      null,
      2,
    ),
  );
  console.log("PUBLIC SMOKE PASSED", base);
} finally {
  await context.tracing.stop({ path: `${dir}/public-smoke.zip` });
  await browser.close();
}
