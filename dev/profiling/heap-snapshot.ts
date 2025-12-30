import * as fs from "node:fs";
import * as path from "node:path";

/* eslint-disable no-console */

/**
 * Heap snapshot utility for capturing and comparing V8 heap snapshots.
 * 
 * Note: This requires Node.js v8.x+ with the `v8` module.
 * 
 * Usage:
 * 1. Take baseline: `node --expose-gc -r ts-node/register dev/profiling/baseline-generator.ts`
 * 2. Compare with: `compareSnapshots('baseline.heapsnapshot', 'current.heapsnapshot')`
 */

export interface SnapshotMetadata {
  filename: string;
  timestamp: number;
  label: string;
  heapUsed: number;
  heapTotal: number;
}

/**
 * Take a heap snapshot and save to file.
 */
export async function takeHeapSnapshot(
  outputDir: string,
  label: string,
): Promise<SnapshotMetadata> {
  // Dynamically import v8 to avoid errors in environments where it's not available.
  // Keep this ESM-safe and avoid explicit `import()` type annotations.
  const v8 = await (async () => {
    try {
      return await import("node:v8");
    } catch {
      throw new Error("v8 module not available. Heap snapshots require Node.js v8.x+");
    }
  })();

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  const timestamp = Date.now();
  const filename = path.join(outputDir, `${label}-${timestamp}.heapsnapshot`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Take snapshot
  const snapshot = v8.writeHeapSnapshot(filename);

  const memUsage = process.memoryUsage();

  const metadata: SnapshotMetadata = {
    filename: snapshot,
    timestamp,
    label,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
  };

  // Write metadata
  const metadataFile = filename.replace(".heapsnapshot", ".meta.json");
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

  console.log(`Heap snapshot saved: ${snapshot}`);
  console.log(`Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  return metadata;
}

/**
 * Compare two heap snapshots and generate a diff report.
 * 
 * This is a basic comparison. For detailed analysis, use Chrome DevTools:
 * 1. Open Chrome DevTools
 * 2. Go to Memory tab
 * 3. Click "Load" and select the .heapsnapshot file
 * 4. Compare snapshots using the "Comparison" view
 */
export function compareSnapshots(baselineFile: string, currentFile: string): string {
  const baselineMetaFile = baselineFile.replace(".heapsnapshot", ".meta.json");
  const currentMetaFile = currentFile.replace(".heapsnapshot", ".meta.json");

  if (!fs.existsSync(baselineMetaFile) || !fs.existsSync(currentMetaFile)) {
    return "Metadata files not found. Cannot compare snapshots.";
  }

  const baselineMeta = JSON.parse(fs.readFileSync(baselineMetaFile, "utf-8")) as SnapshotMetadata;
  const currentMeta = JSON.parse(fs.readFileSync(currentMetaFile, "utf-8")) as SnapshotMetadata;

  const heapUsedDelta = currentMeta.heapUsed - baselineMeta.heapUsed;
  const heapTotalDelta = currentMeta.heapTotal - baselineMeta.heapTotal;

  const lines: string[] = [];
  lines.push("Heap Snapshot Comparison");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Baseline: ${baselineMeta.label} (${new Date(baselineMeta.timestamp).toISOString()})`);
  lines.push(`  Heap Used: ${(baselineMeta.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  lines.push(`  Heap Total: ${(baselineMeta.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  lines.push("");
  lines.push(`Current: ${currentMeta.label} (${new Date(currentMeta.timestamp).toISOString()})`);
  lines.push(`  Heap Used: ${(currentMeta.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  lines.push(`  Heap Total: ${(currentMeta.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  lines.push("");
  lines.push("Delta:");
  lines.push(`  Heap Used: ${(heapUsedDelta / 1024 / 1024).toFixed(2)} MB`);
  lines.push(`  Heap Total: ${(heapTotalDelta / 1024 / 1024).toFixed(2)} MB`);
  lines.push("");
  lines.push(
    "For detailed analysis, load these .heapsnapshot files in Chrome DevTools Memory tab.",
  );

  return lines.join("\n");
}

/**
 * List all heap snapshots in a directory.
 */
export function listSnapshots(dir: string): SnapshotMetadata[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".meta.json"));

  return files
    .map((file) => {
      const fullPath = path.join(dir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      return JSON.parse(content) as SnapshotMetadata;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}
