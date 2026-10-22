import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import lighthousePackage from "lighthouse/package.json" with { type: "json" };
const { version } = lighthousePackage;
const base = process.env.AUDIT_URL ?? "http://127.0.0.1:4173";
const dir = process.env.AUDIT_OUTPUT ?? "docs/reports/lighthouse";
const chromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium"];
  return candidates.find(existsSync) ?? candidates[0];
};
const pages = [
  ["inicio", "/"],
  ["detalhe", "/nfts/1"],
].filter(
  ([name]) =>
    !process.env.AUDIT_PAGES ||
    process.env.AUDIT_PAGES.split(",").includes(name),
);
const profiles = (process.env.AUDIT_PROFILES ?? "desktop,mobile").split(",");
const runs = Number(process.env.AUDIT_RUNS ?? 3);
await mkdir(dir, { recursive: true });
const results = [];
for (const [name, path] of pages)
  for (const formFactor of profiles)
    for (let run = 1; run <= runs; run++) {
      const chrome = await launch({
        chromePath: chromePath(),
        chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
      });
      try {
        const output = await lighthouse(base + path, {
          port: chrome.port,
          output: ["html", "json"],
          onlyCategories: [
            "performance",
            "accessibility",
            "best-practices",
            "seo",
          ],
          logLevel: "error",
          formFactor,
          screenEmulation:
            formFactor === "desktop"
              ? {
                  mobile: false,
                  width: 1440,
                  height: 1000,
                  deviceScaleFactor: 1,
                  disabled: false,
                }
              : {
                  mobile: true,
                  width: 390,
                  height: 844,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
          ...(formFactor === "desktop"
            ? {
                throttling: {
                  rttMs: 40,
                  throughputKbps: 10240,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                  cpuSlowdownMultiplier: 1,
                },
              }
            : {}),
          throttlingMethod: "simulate",
          maxWaitForLoad: 45000,
        });
        const slug = `${name}-${formFactor}-${run}`;
        await writeFile(`${dir}/${slug}.html`, output.report[0]);
        await writeFile(`${dir}/${slug}.json`, output.report[1]);
        const l = output.lhr;
        const result = {
          name,
          formFactor,
          run,
          scores: Object.fromEntries(
            Object.entries(l.categories).map(([k, v]) => [
              k,
              Math.round((v.score ?? 0) * 100),
            ]),
          ),
          LCP: l.audits["largest-contentful-paint"].numericValue,
          CLS: l.audits["cumulative-layout-shift"].numericValue,
          TBT: l.audits["total-blocking-time"].numericValue,
          warnings: l.runWarnings,
        };
        results.push(result);
        console.log(result);
      } finally {
        await chrome.kill();
      }
    }
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const medians = [];
for (const [name] of pages)
  for (const formFactor of profiles) {
    const subset = results.filter(
      (r) => r.name === name && r.formFactor === formFactor,
    );
    medians.push({
      name,
      formFactor,
      scores: Object.fromEntries(
        ["performance", "accessibility", "best-practices", "seo"].map((k) => [
          k,
          median(subset.map((r) => r.scores[k])),
        ]),
      ),
      LCP: median(subset.map((r) => r.LCP)),
      CLS: median(subset.map((r) => r.CLS)),
      TBT: median(subset.map((r) => r.TBT)),
    });
  }
await writeFile(
  `${dir}/summary.json`,
  JSON.stringify(
    {
      environment: {
        date: new Date().toISOString(),
        node: process.version,
        lighthouse: version,
        platform: os.platform(),
        release: os.release(),
        cpus: os.cpus().length,
        base,
        conditions:
          "Build otimizado com MSW e Socket.IO, dados padrão, perfil Chrome novo a cada execução, throttling simulado padrão Lighthouse.",
      },
      medians,
      runs: results,
    },
    null,
    2,
  ),
);
