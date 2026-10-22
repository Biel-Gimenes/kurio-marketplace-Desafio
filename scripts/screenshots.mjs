import { chromium } from "@playwright/test";

const base = process.env.SCREENSHOT_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch();

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
});
await desktop.goto(base, { waitUntil: "networkidle" });
await desktop.waitForTimeout(1500);
await desktop.screenshot({
  path: "docs/screenshots/inicio-desktop.jpg",
  type: "jpeg",
  quality: 82,
});
await desktop.goto(`${base}/nfts/1`, { waitUntil: "networkidle" });
await desktop.waitForTimeout(1000);
await desktop.screenshot({
  path: "docs/screenshots/detalhe-desktop.jpg",
  type: "jpeg",
  quality: 82,
});

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(base, { waitUntil: "networkidle" });
await mobile.waitForTimeout(1500);
await mobile.evaluate(() =>
  document.querySelector("#catalogo")?.scrollIntoView({ block: "start" }),
);
await mobile.waitForTimeout(500);
await mobile.screenshot({
  path: "docs/screenshots/inicio-mobile.jpg",
  type: "jpeg",
  quality: 82,
});

await browser.close();
console.log("Screenshots geradas em docs/screenshots/");
