#!/usr/bin/env node

/**
 * Headless profiling script for NanoBotsIdle
 *
 * Runs the game in a headless browser and collects telemetry metrics
 * for performance profiling and regression detection.
 *
 * Usage:
 *   node scripts/profile.js [options]
 *
 * Options:
 *   --duration <seconds>  How long to run the profile (default: 30)
 *   --output <path>       Where to save the metrics JSON (default: ./profile-metrics.json)
 *   --url <url>           URL to profile (default: http://localhost:5173)
 *   --scene <preset>      Scene preset: default | meshed-heavy | meshed-heavy-occlusion
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { chromium } from "playwright";

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const DURATION_SECONDS = parseInt(getArg("--duration", "30"), 10);
const OUTPUT_PATH = resolve(getArg("--output", "./profile-metrics.json"));
const URL = getArg("--url", "http://localhost:5173");
const SCENE = getArg("--scene", "default");

console.log(`[profile] Starting headless profile...`);
console.log(`[profile] URL: ${URL}`);
console.log(`[profile] Duration: ${DURATION_SECONDS}s`);
console.log(`[profile] Output: ${OUTPUT_PATH}`);
console.log(`[profile] Scene preset: ${SCENE}`);

const getScenePresetConfig = (preset) => {
  switch (preset) {
    case "meshed-heavy":
      return {
        render: {
          voxels: {
            mode: "meshed",
            chunkLoad: { initialRadius: 2, initialDims: 2, activeRadius: 6, activeDims: 3 },
            lod: { progressive: { enabled: true, refineDelayFrames: 2 } },
          },
        },
      };
    case "meshed-heavy-occlusion":
      return {
        render: {
          voxels: {
            mode: "meshed",
            chunkLoad: { initialRadius: 2, initialDims: 2, activeRadius: 6, activeDims: 3 },
            lod: { progressive: { enabled: true, refineDelayFrames: 2 } },
            occlusion: { enabled: true },
          },
        },
      };
    case "default":
    default:
      return null;
  }
};

async function runProfile() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Enable telemetry via URL parameter
  const urlWithTelemetry = `${URL}?telemetry=true`;

  console.log(`[profile] Navigating to ${urlWithTelemetry}...`);
  await page.goto(urlWithTelemetry, { waitUntil: "networkidle" });

  // Enable telemetry in the config
  await page.evaluate(() => {
    const updateConfig = window.updateConfig;
    if (updateConfig) {
      updateConfig({ telemetry: { enabled: true } });
    }
  });

  const sceneConfig = getScenePresetConfig(SCENE);
  if (sceneConfig) {
    await page.evaluate((config) => {
      const updateConfig = window.updateConfig;
      if (updateConfig) {
        updateConfig(config);
      }
    }, sceneConfig);
  }

  console.log(`[profile] Running for ${DURATION_SECONDS}s...`);

  // Collect metrics periodically
  const metricsHistory = [];
  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;

  while (Date.now() < endTime) {
    await page.waitForTimeout(1000); // Sample every second

    try {
      const snapshot = await page.evaluate(() => {
        const fn = window.getTelemetrySnapshot;
        if (fn) {
          return JSON.parse(fn());
        }
        return null;
      });

      if (snapshot) {
        metricsHistory.push({
          timestamp: Date.now(),
          ...snapshot,
        });
      }
    } catch (error) {
      console.error(`[profile] Error collecting metrics:`, error);
    }
  }

  console.log(`[profile] Collected ${metricsHistory.length} snapshots`);

  // Compute aggregate statistics
  const aggregate = computeAggregateStats(metricsHistory);

  // Save results
  const results = {
    meta: {
      url: urlWithTelemetry,
      duration: DURATION_SECONDS,
      samplesCollected: metricsHistory.length,
      timestamp: new Date().toISOString(),
    },
    aggregate,
    history: metricsHistory,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`[profile] Results saved to ${OUTPUT_PATH}`);

  await browser.close();
}

function computeAggregateStats(history) {
  if (history.length === 0) {
    return {};
  }

  const fps = history.map((s) => s.fps?.current ?? 0).filter((v) => v > 0);
  const frameTime = history.map((s) => s.frameTime?.current ?? 0).filter((v) => v > 0);
  const drawCalls = history.map((s) => s.drawCalls?.current ?? 0).filter((v) => v > 0);
  const meshingTime = history.map((s) => s.meshing?.avgTimePerChunk ?? 0).filter((v) => v > 0);
  const workerSimMs = history.map((s) => s.worker?.simMs ?? 0).filter((v) => v > 0);

  const computeStats = (values) => {
    if (values.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    return {
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      p50,
      p95,
      p99,
    };
  };

  return {
    fps: computeStats(fps),
    frameTime: computeStats(frameTime),
    drawCalls: computeStats(drawCalls),
    meshingTime: computeStats(meshingTime),
    workerSimMs: computeStats(workerSimMs),
    totalChunksMeshed:
      history.length > 0 ? (history[history.length - 1].meshing?.totalChunks ?? 0) : 0,
  };
}

runProfile().catch((error) => {
  console.error("[profile] Fatal error:", error);
  process.exit(1);
});
