import { expect, type Page } from "@playwright/test";
export async function api<T = unknown>(
  page: Page,
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  headers: Record<string, string> = {},
): Promise<T> {
  return page.evaluate(
    async ({ path, body, method, headers }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return response.json();
    },
    { path, body, method, headers },
  );
}
export async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(9);
}
export async function login(
  page: Page,
  email = "nova@kurio.art",
  target = "/perfil",
) {
  await page.goto(`/login?returnTo=${encodeURIComponent(target)}`);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("E-mail", { exact: true }).fill(email);
  await dialog.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await dialog.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(target.replace("/", "\\/")));
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
export async function add(page: Page, id = "1") {
  await page.goto(`/nfts/${id}`);
  await page.getByRole("button", { name: "COMPRAR", exact: true }).click();
  await expect(page.locator(".cart-row")).toHaveCount(1);
}
export async function checkout(page: Page) {
  await ready(page);
  await add(page);
  await login(page, "nova@kurio.art", "/checkout");
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(page.locator(".wallet-connected")).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revise sua compra" }),
  ).toBeVisible();
}
export async function demo(page: Page, body: Record<string, unknown>) {
  await api(page, "/demo", body);
}
