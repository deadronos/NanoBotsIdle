import { describe, expect, it } from "vitest";

import { MeshingScheduler, type MeshingWorkerLike } from "../src/meshing/meshingScheduler";
import type { FromMeshingWorker, ToMeshingWorker } from "../src/shared/meshingProtocol";

/**
 * Lifecycle tests for chunk load/unload cycles.
 * Ensures that repeated chunk operations don't cause unbounded memory growth.
 */

class FakeMeshingWorker implements MeshingWorkerLike {
  public posted: { msg: ToMeshingWorker; transfer?: Transferable[] }[] = [];
  private handler: ((event: MessageEvent<FromMeshingWorker>) => void) | null = null;
  public terminated = false;

  addEventListener(type: "message", handler: (event: MessageEvent<FromMeshingWorker>) => void) {
    if (type !== "message") return;
    this.handler = handler;
  }

  removeEventListener(type: "message", handler: (event: MessageEvent<FromMeshingWorker>) => void) {
    if (type !== "message") return;
    if (this.handler === handler) this.handler = null;
  }

  postMessage(message: ToMeshingWorker, transfer?: Transferable[]) {
    this.posted.push({ msg: message, transfer });
  }

  terminate() {
    this.terminated = true;
    this.handler = null;
  }

  emit(msg: FromMeshingWorker) {
    if (!this.handler) throw new Error("No handler attached");
    this.handler({ data: msg } as MessageEvent<FromMeshingWorker>);
  }

  hasHandlerAttached() {
    return this.handler !== null;
  }
}

describe("Chunk Lifecycle Tests", () => {
  it("should not accumulate dirty entries after repeated mark/clear cycles", () => {
    const worker = new FakeMeshingWorker();
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
      onApply: () => undefined,
    });

    // Repeatedly mark dirty and clear to simulate chunk load/unload
    const iterations = 100;
    const chunkCount = 10;

    for (let i = 0; i < iterations; i++) {
      // Mark multiple chunks dirty
      for (let c = 0; c < chunkCount; c++) {
        scheduler.markDirty({ cx: c, cy: 0, cz: 0 });
      }

      // Clear all
      scheduler.clearAll();
    }

    // After clearing, verify no dirty chunks remain
    expect(scheduler.getDirtyKeys().length).toBe(0);
    expect(scheduler.getInFlightCount()).toBe(0);

    scheduler.dispose();
  });

  it("should not leak memory from chunk revisions after many updates", () => {
    const worker = new FakeMeshingWorker();
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
      onApply: () => undefined,
    });

    const coord = { cx: 0, cy: 0, cz: 0 };
    const iterations = 1000;

    // Mark the same chunk dirty many times
    for (let i = 0; i < iterations; i++) {
      scheduler.markDirty(coord);
    }

    // Revision should increment but internal maps should not grow unboundedly
    const finalRevision = scheduler.getChunkRevision(coord);
    expect(finalRevision).toBe(iterations);

    // Only one dirty entry should exist (not 1000)
    expect(scheduler.getDirtyKeys().length).toBe(1);

    scheduler.dispose();
  });

  it("should cleanup all resources on dispose", () => {
    const worker = new FakeMeshingWorker();
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
      onApply: () => undefined,
    });

    // Add some work
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 1, cy: 0, cz: 0 });

    expect(worker.hasHandlerAttached()).toBe(true);
    expect(worker.terminated).toBe(false);

    // Dispose should remove event handlers and terminate worker
    scheduler.dispose();

    expect(worker.hasHandlerAttached()).toBe(false);
    expect(worker.terminated).toBe(true);
  });

  it("should handle repeated reprioritization without growth", () => {
    const worker = new FakeMeshingWorker();
    let priorityCallCount = 0;

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
      onApply: () => undefined,
      getPriority: () => {
        priorityCallCount++;
        return 0;
      },
    });

    // Mark several chunks dirty
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 1, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 2, cy: 0, cz: 0 });

    const initialDirtyCount = scheduler.getDirtyKeys().length;
    expect(initialDirtyCount).toBe(3);

    // Reprioritize many times (simulating camera movement)
    const reprioritizeCount = 50;
    for (let i = 0; i < reprioritizeCount; i++) {
      scheduler.reprioritizeDirty();
    }

    // Dirty count should remain the same
    expect(scheduler.getDirtyKeys().length).toBe(initialDirtyCount);

    // Priority function should be called during reprioritization
    expect(priorityCallCount).toBeGreaterThan(0);

    scheduler.dispose();
  });

  it("should properly track in-flight jobs and not accumulate stale ones", () => {
    const worker = new FakeMeshingWorker();
    const applied: number[] = [];

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
      onApply: (result) => applied.push(result.jobId),
      maxInFlight: 2,
    });

    // Mark chunks and pump
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 1, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 2, cy: 0, cz: 0 });
    scheduler.pump();

    // Should have 2 in flight (maxInFlight = 2)
    expect(scheduler.getInFlightCount()).toBe(2);

    // Emit results for the jobs
    const jobs = worker.posted.slice(0, 2);
    jobs.forEach((job) => {
      if (job.msg.t === "MESH_CHUNK") {
        worker.emit({
          t: "MESH_RESULT",
          jobId: job.msg.jobId,
          rev: job.msg.rev,
          chunk: job.msg.chunk,
          geometry: {
            positions: new Float32Array([]),
            normals: new Float32Array([]),
            indices: new Uint16Array([]),
          },
        });
      }
    });

    // In-flight count should decrease after results come in
    // The third chunk is still dirty but not yet in flight
    expect(scheduler.getInFlightCount()).toBe(1);
    expect(applied.length).toBe(2);

    scheduler.dispose();
  });
});
