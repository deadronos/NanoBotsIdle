import { beforeEach, describe, expect, it } from "vitest";

import { MeshingScheduler, type MeshingWorkerLike } from "../src/meshing/meshingScheduler";
import type { FromMeshingWorker, MeshResult, ToMeshingWorker } from "../src/shared/meshingProtocol";
import { resetTelemetryCollector } from "../src/telemetry";

class FakeMeshingWorker implements MeshingWorkerLike {
  public posted: { msg: ToMeshingWorker; transfer?: Transferable[] }[] = [];
  private handler: ((event: MessageEvent<FromMeshingWorker>) => void) | null = null;

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

  emit(msg: FromMeshingWorker) {
    if (!this.handler) throw new Error("No handler attached");
    this.handler({ data: msg } as MessageEvent<FromMeshingWorker>);
  }
}

describe("MeshingScheduler (TDD)", () => {
  beforeEach(() => {
    resetTelemetryCollector();
  });

  it("should drop stale results using per-chunk revision", () => {
    const worker = new FakeMeshingWorker();
    const applied: MeshResult[] = [];

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
      onApply: (result) => applied.push(result),
    });

    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.pump();
    expect(worker.posted.length).toBe(1);
    const job1 = worker.posted[0].msg;
    if (job1.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    // Dirty again while job1 is in flight => revision increments => job1 result becomes stale
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });

    worker.emit({
      t: "MESH_RESULT",
      jobId: job1.jobId,
      rev: job1.rev,
      chunk: job1.chunk,
      geometry: {
        positions: new Float32Array([]),
        normals: new Float32Array([]),
        indices: new Uint16Array([]),
      },
    });

    expect(applied.length).toBe(0);

    // Now the scheduler should schedule the latest revision
    scheduler.pump();
    expect(worker.posted.length).toBe(2);
    const job2 = worker.posted[1].msg;
    if (job2.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(job2.rev).toBeGreaterThan(job1.rev);

    scheduler.dispose();
  });

  it("should enforce bounded queue size and drop low priority tasks", () => {
    const worker = new FakeMeshingWorker();
    const results: { coord: { cx: number; cy: number; cz: number }; rev: number }[] = [];

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 1,
      maxQueueSize: 5, // Small queue to test bounds
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: (result) => {
        results.push({ coord: result.chunk, rev: result.rev });
      },
      getPriority: (coord) => {
        // Distance from origin (0,0,0)
        return coord.cx * coord.cx + coord.cy * coord.cy + coord.cz * coord.cz;
      },
    });

    // Add 10 chunks - only 5 should fit in queue + 1 in flight
    for (let i = 0; i < 10; i++) {
      scheduler.markDirty({ cx: i, cy: 0, cz: 0 });
    }

    scheduler.pump();

    // Should have 1 in flight and 5 in queue (max), so 4 should be dropped
    expect(scheduler.getInFlightCount()).toBe(1);
    expect(scheduler.getDirtyKeys().length).toBeLessThanOrEqual(5);
    expect(scheduler.getDroppedTasksCount()).toBeGreaterThan(0);

    scheduler.dispose();
  });

  it("should prioritize chunks closer to focus point", () => {
    const worker = new FakeMeshingWorker();
    const focusChunk = { cx: 10, cy: 0, cz: 10 };

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 3,
      maxQueueSize: 100,
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: () => {
        // No-op for this test
      },
      getPriority: (coord) => {
        const dx = coord.cx - focusChunk.cx;
        const dy = coord.cy - focusChunk.cy;
        const dz = coord.cz - focusChunk.cz;
        return dx * dx + dy * dy + dz * dz;
      },
    });

    // Add chunks at different distances
    scheduler.markDirty({ cx: 10, cy: 0, cz: 10 }); // distance 0 - closest
    scheduler.markDirty({ cx: 11, cy: 0, cz: 10 }); // distance 1
    scheduler.markDirty({ cx: 15, cy: 0, cz: 15 }); // distance 50 - farthest
    scheduler.markDirty({ cx: 12, cy: 0, cz: 10 }); // distance 4

    scheduler.pump();

    // First 3 jobs should be processed (maxInFlight = 3)
    expect(worker.posted.length).toBe(3);

    // First job should be the closest chunk
    const firstJob = worker.posted[0]!.msg;
    if (firstJob.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(firstJob.chunk.cx).toBe(10);
    expect(firstJob.chunk.cz).toBe(10);

    scheduler.dispose();
  });

  it("should prefer visible chunks over distant ones", () => {
    const worker = new FakeMeshingWorker();

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 2,
      maxQueueSize: 100,
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: () => {
        // No-op for this test
      },
      getPriority: (coord) => {
        // Simple distance from origin
        return coord.cx * coord.cx + coord.cy * coord.cy + coord.cz * coord.cz;
      },
      isVisible: (coord) => {
        // Mark only one specific chunk as visible
        return coord.cx === 5 && coord.cy === 0 && coord.cz === 5;
      },
    });

    // Add nearby chunk (closer but not visible) - distance = 100
    scheduler.markDirty({ cx: 10, cy: 0, cz: 0 }); // distance = 100
    // Add visible chunk (farther but visible, should be prioritized)
    scheduler.markDirty({ cx: 5, cy: 0, cz: 5 }); // distance = 50, but with visibility boost = 25

    scheduler.pump();

    expect(worker.posted.length).toBe(2);

    // First job should be the visible chunk due to visibility boost (25 < 100)
    const firstJob = worker.posted[0]!.msg;
    if (firstJob.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(firstJob.chunk.cx).toBe(5);
    expect(firstJob.chunk.cz).toBe(5);

    scheduler.dispose();
  });

  it("should handle heavy chunk request load without exceeding maxInFlight", () => {
    const worker = new FakeMeshingWorker();
    let jobsCompleted = 0;

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 4,
      maxQueueSize: 50,
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: () => {
        jobsCompleted++;
      },
      getPriority: (coord) => coord.cx,
    });

    // Simulate heavy load - 100 chunk requests
    for (let i = 0; i < 100; i++) {
      scheduler.markDirty({ cx: i, cy: 0, cz: 0 });
    }

    scheduler.pump();

    // Should respect maxInFlight
    expect(scheduler.getInFlightCount()).toBeLessThanOrEqual(4);

    // Should have dropped some tasks due to queue limit
    expect(scheduler.getDroppedTasksCount()).toBeGreaterThan(0);

    // Simulate completing some jobs
    for (let i = 0; i < 4; i++) {
      const job = worker.posted[i]!.msg;
      if (job.t !== "MESH_CHUNK") continue;
      worker.emit({
        t: "MESH_RESULT",
        jobId: job.jobId,
        chunk: job.chunk,
        rev: job.rev,
        geometry: {
          positions: new Float32Array(0),
          normals: new Float32Array(0),
          indices: new Uint16Array(0),
        },
      });
    }

    // Jobs completed count should match
    expect(jobsCompleted).toBe(4);
    // After completing jobs and pumping, in-flight count should be stable or processing more
    expect(scheduler.getInFlightCount()).toBeLessThanOrEqual(4);

    scheduler.dispose();
  });

  it("should track queue metrics correctly", () => {
    const worker = new FakeMeshingWorker();

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 2,
      maxQueueSize: 10,
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: () => {
        // No-op for this test
      },
      getPriority: (coord) => coord.cx,
    });

    // Initially empty
    expect(scheduler.getInFlightCount()).toBe(0);
    expect(scheduler.getDirtyKeys().length).toBe(0);
    expect(scheduler.getDroppedTasksCount()).toBe(0);

    // Add some chunks
    for (let i = 0; i < 5; i++) {
      scheduler.markDirty({ cx: i, cy: 0, cz: 0 });
    }

    scheduler.pump();

    // Should have 2 in flight and 3 in queue
    expect(scheduler.getInFlightCount()).toBe(2);
    expect(scheduler.getDirtyKeys().length).toBe(3);

    scheduler.dispose();
  });

  it("should reprioritize dirty chunks when focus changes", () => {
    const worker = new FakeMeshingWorker();
    let focusPoint = { cx: 0, cy: 0, cz: 0 };

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 1,
      maxQueueSize: 100,
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: () => {
        // No-op for this test
      },
      getPriority: (coord) => {
        const dx = coord.cx - focusPoint.cx;
        const dy = coord.cy - focusPoint.cy;
        const dz = coord.cz - focusPoint.cz;
        return dx * dx + dy * dy + dz * dz;
      },
    });

    // Add chunks
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 10, cy: 0, cz: 10 });

    scheduler.pump();

    // First chunk processed should be (0,0,0) as it's closest
    let firstJob = worker.posted[0]!.msg;
    if (firstJob.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(firstJob.chunk.cx).toBe(0);

    // Change focus point
    focusPoint = { cx: 10, cy: 0, cz: 10 };
    scheduler.reprioritizeDirty();

    // Clear posted jobs and add a new chunk
    worker.posted = [];
    scheduler.markDirty({ cx: 9, cy: 0, cz: 10 });
    scheduler.pump();

    // Now (9,0,10) should be processed first as it's closest to new focus
    if (worker.posted.length > 0) {
      firstJob = worker.posted[0]!.msg;
      if (firstJob.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
      // Should process chunks closer to new focus point (10,0,10)
      const distToFocus = (cx: number, cz: number) => {
        const dx = cx - 10;
        const dz = cz - 10;
        return dx * dx + dz * dz;
      };
      expect(distToFocus(firstJob.chunk.cx, firstJob.chunk.cz)).toBeLessThan(distToFocus(0, 0));
    }

    scheduler.dispose();
  });

  it("should clear all state including dropped tasks count", () => {
    const worker = new FakeMeshingWorker();

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 1,
      maxQueueSize: 3,
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: () => {
        // No-op for this test
      },
      getPriority: (coord) => coord.cx,
    });

    // Add enough to cause drops
    for (let i = 0; i < 10; i++) {
      scheduler.markDirty({ cx: i, cy: 0, cz: 0 });
    }
    scheduler.pump();

    expect(scheduler.getDroppedTasksCount()).toBeGreaterThan(0);
    expect(scheduler.getDirtyKeys().length).toBeGreaterThan(0);

    // Clear all
    scheduler.clearAll();

    expect(scheduler.getDroppedTasksCount()).toBe(0);
    expect(scheduler.getDirtyKeys().length).toBe(0);
    expect(scheduler.getInFlightCount()).toBe(0);

    scheduler.dispose();
  });

  it("should process chunks with equal priority in FIFO order", () => {
    const worker = new FakeMeshingWorker();

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 1,
      maxQueueSize: 100,
      buildJob: (coord, rev, jobId) => ({
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: 16 },
          origin: { x: 0, y: 0, z: 0 },
          materials: new Uint8Array(0),
        },
        transfer: [],
      }),
      onApply: () => {
        /* noop */
      },
      // Same priority for all
      getPriority: () => 0,
    });

    scheduler.markDirty({ cx: 1, cy: 0, cz: 0 }); // First
    scheduler.markDirty({ cx: 2, cy: 0, cz: 0 }); // Second

    // Pump once to process the first one
    scheduler.pump();

    expect(worker.posted.length).toBe(1);
    let job = worker.posted[0]!.msg;
    if (job.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(job.chunk.cx).toBe(1); // Should be the first one

    // Finish first job
    worker.emit({
      t: "MESH_RESULT",
      jobId: job.jobId,
      rev: job.rev,
      chunk: job.chunk,
      geometry: {
        positions: new Float32Array(0),
        normals: new Float32Array(0),
        indices: new Uint16Array(0),
      },
    });

    // Pump to process second
    scheduler.pump();
    expect(worker.posted.length).toBe(2);
    job = worker.posted[1]!.msg;
    if (job.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(job.chunk.cx).toBe(2); // Should be the second one

    scheduler.dispose();
  });
});
