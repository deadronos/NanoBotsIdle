#!/usr/bin/env node
/**
 * Baseline memory profile generator.
 * 
 * This script generates a baseline memory profile for the application
 * by simulating common operations and capturing heap snapshots.
 * 
 * Usage:
 *   node --expose-gc dev/profiling/baseline-generator.js
 * 
 * Or with ts-node:
 *   node --expose-gc -r ts-node/register dev/profiling/baseline-generator.ts
 */

import * as path from "node:path";

import { MeshingScheduler, type MeshingWorkerLike } from "../../src/meshing/meshingScheduler";
import type { FromMeshingWorker, ToMeshingWorker } from "../../src/shared/meshingProtocol";
import { takeHeapSnapshot } from "./heap-snapshot";
import { MemoryTracker } from "./memory-tracker";

// Mock worker for testing
class MockWorker implements MeshingWorkerLike {
  private handler: ((event: MessageEvent<FromMeshingWorker>) => void) | null = null;

  postMessage(message: ToMeshingWorker, transfer?: Transferable[]) {
    // Simulate async work
    setTimeout(() => {
      if (this.handler && message.t === "MESH_CHUNK") {
        this.handler({
          data: {
            t: "MESH_RESULT",
            jobId: message.jobId,
            rev: message.rev,
            chunk: message.chunk,
            geometry: {
              positions: new Float32Array(0),
              normals: new Float32Array(0),
              indices: new Uint16Array(0),
            },
          },
        } as MessageEvent<FromMeshingWorker>);
      }
    }, 1);
  }

  addEventListener(type: "message", handler: (event: MessageEvent<FromMeshingWorker>) => void) {
    if (type === "message") this.handler = handler;
  }

  removeEventListener(type: "message", handler: (event: MessageEvent<FromMeshingWorker>) => void) {
    if (this.handler === handler) this.handler = null;
  }

  terminate() {
    this.handler = null;
  }
}

async function generateBaseline() {
  console.log("Starting baseline memory profile generation...");
  console.log("");

  if (!global.gc) {
    console.warn("WARNING: --expose-gc flag not detected. Results may be less accurate.");
    console.warn("Run with: node --expose-gc dev/profiling/baseline-generator.js");
    console.log("");
  }

  const outputDir = path.join(process.cwd(), "dev", "profiling", "snapshots");
  const tracker = new MemoryTracker();

  // Initial snapshot
  tracker.snapshot("initial");
  await takeHeapSnapshot(outputDir, "baseline-initial");

  console.log("Phase 1: Simulating chunk operations...");
  const worker = new MockWorker();
  const scheduler = new MeshingScheduler({
    worker,
    chunkSize: 16,
    buildJob: (coord, rev, jobId) => {
      const materials = new Uint8Array(18 * 18 * 18);
      return {
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: coord.cx * 16, y: coord.cy * 16, z: coord.cz * 16 },
          materials,
        },
        transfer: [materials.buffer],
      };
    },
    onApply: () => {},
  });

  // Simulate chunk load/unload cycles
  for (let cycle = 0; cycle < 10; cycle++) {
    for (let i = 0; i < 100; i++) {
      scheduler.markDirty({ cx: i % 10, cy: 0, cz: Math.floor(i / 10) });
    }
    scheduler.pump();
    await new Promise((resolve) => setTimeout(resolve, 100));
    scheduler.clearAll();

    if (cycle % 3 === 0) {
      tracker.snapshot(`after-cycle-${cycle}`);
    }
  }

  scheduler.dispose();
  tracker.snapshot("after-chunk-ops");

  console.log("Phase 2: Simulating repeated allocations...");
  const arrays: Uint8Array[] = [];
  for (let i = 0; i < 1000; i++) {
    arrays.push(new Uint8Array(1024)); // 1KB each
  }
  tracker.snapshot("after-allocations");

  // Clear arrays
  arrays.length = 0;
  if (global.gc) global.gc();
  tracker.snapshot("after-cleanup");

  await takeHeapSnapshot(outputDir, "baseline-final");

  console.log("");
  console.log(tracker.report());

  console.log("");
  console.log("Baseline generation complete!");
  console.log(`Snapshots saved to: ${outputDir}`);
  console.log("");
  console.log("To analyze:");
  console.log("1. Open Chrome DevTools");
  console.log("2. Go to Memory tab");
  console.log("3. Click 'Load' and select a .heapsnapshot file");
  console.log("4. Use 'Comparison' view to compare snapshots");
}

// Run if executed directly
if (require.main === module) {
  generateBaseline().catch((error) => {
    console.error("Error generating baseline:", error);
    process.exit(1);
  });
}

export { generateBaseline };
