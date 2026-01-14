#!/usr/bin/env node

/**
 * Performance Regression Checker
 *
 * Compares current performance metrics against a baseline and fails if
 * regressions exceed configured thresholds.
 *
 * Usage:
 *   node scripts/check-performance-regression.js --current <path> --baseline <path> [options]
 *
 * Options:
 *   --current <path>      Path to current metrics JSON
 *   --baseline <path>     Path to baseline metrics JSON
 *   --thresholds <path>   Path to thresholds config (default: .github/performance-thresholds.json)
 *   --warning-only        Only warn, don't fail on regressions
 *   --output <path>       Write detailed report to file
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};
const hasFlag = (name) => args.includes(name);

const CURRENT_PATH = getArg("--current", null);
const BASELINE_PATH = getArg("--baseline", null);
const THRESHOLDS_PATH = getArg(
  "--thresholds",
  ".github/performance-thresholds.json",
);
const WARNING_ONLY = hasFlag("--warning-only") || process.env.PERF_WARNING_ONLY === "true";
const OUTPUT_PATH = getArg("--output", null);

if (!CURRENT_PATH || !BASELINE_PATH) {
  console.error("Error: --current and --baseline paths are required");
  console.error("Usage: node scripts/check-performance-regression.js --current <path> --baseline <path>");
  process.exit(1);
}

console.log("[regression-check] Loading metrics...");
console.log(`  Current: ${CURRENT_PATH}`);
console.log(`  Baseline: ${BASELINE_PATH}`);
console.log(`  Thresholds: ${THRESHOLDS_PATH}`);

// Load files
const currentData = JSON.parse(readFileSync(resolve(CURRENT_PATH), "utf-8"));
const baselineData = JSON.parse(readFileSync(resolve(BASELINE_PATH), "utf-8"));
const thresholds = JSON.parse(readFileSync(resolve(THRESHOLDS_PATH), "utf-8")).thresholds;

// Extract aggregate metrics
const current = currentData.aggregate;
const baseline = baselineData.aggregate;

// Helper to calculate percent change
const percentChange = (current, baseline) => {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
};

// Helper to format percent with sign
const formatPercent = (value) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

// Check results
const results = [];
let hasFailure = false;

// FPS Check (lower is worse)
const fpsChange = percentChange(current.fps.avg, baseline.fps.avg);
const fpsRegression = fpsChange < -thresholds.fps.regressionPercent;
results.push({
  metric: "FPS (avg)",
  baseline: baseline.fps.avg.toFixed(2),
  current: current.fps.avg.toFixed(2),
  change: formatPercent(fpsChange),
  threshold: `±${thresholds.fps.regressionPercent}%`,
  status: fpsRegression ? "❌ FAIL" : current.fps.avg < thresholds.fps.avgMin ? "⚠️  WARN" : "✅ PASS",
});
if (fpsRegression) {
  hasFailure = true;
  console.log(`\n❌ FPS regression detected: ${fpsChange.toFixed(2)}% (threshold: ${thresholds.fps.regressionPercent}%)`);
}

// Frame Time Check (higher is worse)
const frameTimeChange = percentChange(current.frameTime.avg, baseline.frameTime.avg);
const frameTimeRegression = frameTimeChange > thresholds.frameTime.regressionPercent;
results.push({
  metric: "Frame Time (avg)",
  baseline: `${baseline.frameTime.avg.toFixed(2)}ms`,
  current: `${current.frameTime.avg.toFixed(2)}ms`,
  change: formatPercent(frameTimeChange),
  threshold: `±${thresholds.frameTime.regressionPercent}%`,
  status: frameTimeRegression ? "❌ FAIL" : current.frameTime.avg > thresholds.frameTime.avgMax ? "⚠️  WARN" : "✅ PASS",
});
if (frameTimeRegression) {
  hasFailure = true;
  console.log(`\n❌ Frame time regression detected: ${frameTimeChange.toFixed(2)}% (threshold: ${thresholds.frameTime.regressionPercent}%)`);
}

// Meshing Time Check (higher is worse)
const meshingChange = percentChange(current.meshingTime.avg, baseline.meshingTime.avg);
const meshingRegression = meshingChange > thresholds.meshingTime.regressionPercent;
results.push({
  metric: "Meshing Time (avg)",
  baseline: `${baseline.meshingTime.avg.toFixed(2)}ms`,
  current: `${current.meshingTime.avg.toFixed(2)}ms`,
  change: formatPercent(meshingChange),
  threshold: `±${thresholds.meshingTime.regressionPercent}%`,
  status: meshingRegression ? "❌ FAIL" : current.meshingTime.avg > thresholds.meshingTime.avgMax ? "⚠️  WARN" : "✅ PASS",
});
if (meshingRegression) {
  hasFailure = true;
  console.log(`\n❌ Meshing time regression detected: ${meshingChange.toFixed(2)}% (threshold: ${thresholds.meshingTime.regressionPercent}%)`);
}

// Worker Sim Time Check (higher is worse)
const workerChange = percentChange(current.workerSimMs.avg, baseline.workerSimMs.avg);
const workerRegression = workerChange > thresholds.workerSimMs.regressionPercent;
results.push({
  metric: "Worker Sim Time (avg)",
  baseline: `${baseline.workerSimMs.avg.toFixed(2)}ms`,
  current: `${current.workerSimMs.avg.toFixed(2)}ms`,
  change: formatPercent(workerChange),
  threshold: `±${thresholds.workerSimMs.regressionPercent}%`,
  status: workerRegression ? "❌ FAIL" : current.workerSimMs.avg > thresholds.workerSimMs.avgMax ? "⚠️  WARN" : "✅ PASS",
});
if (workerRegression) {
  hasFailure = true;
  console.log(`\n❌ Worker sim time regression detected: ${workerChange.toFixed(2)}% (threshold: ${thresholds.workerSimMs.regressionPercent}%)`);
}

// Generate report
const report = {
  summary: {
    timestamp: new Date().toISOString(),
    hasFailure,
    warningOnly: WARNING_ONLY,
  },
  comparison: results,
  metadata: {
    current: currentData.meta,
    baseline: baselineData.meta,
  },
};

// Print summary table
console.log("\n📊 Performance Regression Check Results\n");
console.log("| Metric | Baseline | Current | Change | Threshold | Status |");
console.log("|--------|----------|---------|--------|-----------|--------|");
results.forEach((r) => {
  console.log(`| ${r.metric} | ${r.baseline} | ${r.current} | ${r.change} | ${r.threshold} | ${r.status} |`);
});

// Write detailed report if requested
if (OUTPUT_PATH) {
  writeFileSync(resolve(OUTPUT_PATH), JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report written to: ${OUTPUT_PATH}`);
}

// Exit with appropriate code
if (hasFailure && !WARNING_ONLY) {
  console.log("\n❌ Performance regression detected - CI check FAILED");
  console.log("Tip: Review the metrics above and investigate the causes of regression.");
  process.exit(1);
} else if (hasFailure) {
  console.log("\n⚠️  Performance regression detected - WARNING ONLY mode");
  process.exit(0);
} else {
  console.log("\n✅ No performance regressions detected");
  process.exit(0);
}
