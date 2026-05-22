// Screenshot the running dev server's main UI.
// Pre-req: dev server already listening on http://localhost:3000 in the same shell.
//
// Run with:  node scripts/screenshot.mjs
//
// Tunables via env:
//   URL          (default http://localhost:3000)
//   OUT          (default docs/img/ui.png)
//   WIDTH/HEIGHT (default 1440x1100)

import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:3000";
const out = process.env.OUT || "docs/img/ui.png";
const width = Number(process.env.WIDTH || 1440);
const height = Number(process.env.HEIGHT || 1100);

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
console.log("→", url);
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("text=/Hardware Feasibility/i", { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
console.log("✓ wrote", out);
await browser.close();
