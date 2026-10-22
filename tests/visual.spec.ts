import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { add, login, ready } from "./helpers";
async function stable(page: import("@playwright/test").Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skeleton").first().waitFor({ state: "hidden" });
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = "eager";
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
  });
  await page.addStyleTag({
    content:
      ".toast,.demo-trigger{visibility:hidden!important}*{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
}
for (const screen of ["inicio", "detalhe", "carrinho", "pagamento"])
  test(`visual ${screen}`, async ({ page }) => {
    await ready(page);
    if (screen === "detalhe") await page.goto("/nfts/1");
    if (screen === "carrinho" || screen === "pagamento") await add(page);
    if (screen === "pagamento")
      await login(page, "nova@kurio.art", "/checkout");
    await stable(page);
    await expect(page).toHaveScreenshot(`${screen}.png`, {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.002,
    });
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  });
test("responsividade em 390, 414, 768 e 1440 pixels", async ({ page }) => {
  await ready(page);
  await add(page);
  await login(page, "nova@kurio.art", "/checkout");
  for (const width of [390, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 896 });
    for (const path of [
      "/",
      "/nfts/1",
      "/carrinho",
      "/checkout",
      "/perfil",
      "/carteiras",
    ]) {
      await page.goto(path);
      await stable(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
