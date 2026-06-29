#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "screenshots");
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";

const pages = [
  { route: "/demo/reply", file: "screenshot-reply.png" },
  { route: "/demo/warmup", file: "screenshot-warmup.png" },
  { route: "/demo/influence", file: "screenshot-influence.png" },
  { route: "/demo/analytics", file: "screenshot-analytics.png" },
];

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const { route, file } of pages) {
    const url = `${baseUrl}${route}`;
    console.log(`Capturing ${url} → ${file}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("#screenshot-target", { timeout: 30000 });
    await page.waitForTimeout(800);

    const target = page.locator("#screenshot-target");
    await target.screenshot({
      path: path.join(outDir, file),
      animations: "disabled",
    });
  }

  await browser.close();
  console.log("Screenshots saved to public/screenshots/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
