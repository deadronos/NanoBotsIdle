import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { test } from "@playwright/test";

const SAMPLE_MS = Number(process.env.PERF_SAMPLE_MS ?? "6000");
const OUTPUT_PATH = process.env.PERF_OUTPUT ?? ".agent_work/perf-baseline.json";

test("capture perf baseline", async ({ page }) => {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`console.${msg.type()}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`pageerror: ${error.message}`);
  });

  await page.goto("/");
  await page.waitForFunction(() => window.__nanobotsPerf?.setEnabled);

  const startButton = page.getByRole("button", { name: "Start" });
  if (await startButton.isVisible()) {
    await startButton.click();
  }

  await page.evaluate(() => {
    window.__nanobotsPerf?.reset();
    window.__nanobotsPerf?.setEnabled(true);
  });

  const hasWebGL = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return false;
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  });
  console.log(`WebGL context available: ${hasWebGL}`);

  await page.waitForFunction(() => (window.__nanobotsPerf?.count ?? 0) > 0, null, {
    timeout: 10000,
  });

  await page.waitForTimeout(SAMPLE_MS);

  const snapshot = await page.evaluate(() => window.__nanobotsPerf?.snapshot());
  if (!snapshot) {
    throw new Error("Perf snapshot missing.");
  }
  if (!snapshot.count) {
    throw new Error("Perf snapshot has no frames.");
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Perf baseline saved to ${OUTPUT_PATH}`);
  console.log(JSON.stringify(snapshot, null, 2));
});
