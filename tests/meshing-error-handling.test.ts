import { beforeEach, describe, expect, it } from "vitest";

import { MeshingScheduler, type MeshingWorkerLike } from "../src/meshing/meshingScheduler";
import type { FromMeshingWorker, MeshResult, ToMeshingWorker } from "../src/shared/meshingProtocol";
import { getTelemetryCollector, resetTelemetryCollector } from "../src/telemetry";

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

describe("MeshingScheduler error handling with retry", () => {
  beforeEach(() => {
    resetTelemetryCollector();
  });

  it("should retry meshing job on MESH_ERROR up to maxRetries", () => {
    const worker = new FakeMeshingWorker();
    const applied: MeshResult[] = [];
    const telemetry = getTelemetryCollector();
    telemetry.setEnabled(true);

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
      maxRetries: 3,
    });

    // Mark chunk as dirty
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.pump();

    expect(worker.posted.length).toBe(1);
    const job1 = worker.posted[0]!.msg;
    if (job1.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    // Emit error for first attempt
    worker.emit({
      t: "MESH_ERROR",
      jobId: job1.jobId,
      chunk: job1.chunk,
      rev: job1.rev,
      message: "Meshing failed - attempt 1",
    });

    // Should retry automatically
    expect(worker.posted.length).toBe(2);
    expect(applied.length).toBe(0);

    const job2 = worker.posted[1]!.msg;
    if (job2.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    // Second attempt also fails
    worker.emit({
      t: "MESH_ERROR",
      jobId: job2.jobId,
      chunk: job2.chunk,
      rev: job2.rev,
      message: "Meshing failed - attempt 2",
    });

    // Should retry again
    expect(worker.posted.length).toBe(3);

    const job3 = worker.posted[2]!.msg;
    if (job3.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    // Third attempt also fails (max retries reached)
    worker.emit({
      t: "MESH_ERROR",
      jobId: job3.jobId,
      chunk: job3.chunk,
      rev: job3.rev,
      message: "Meshing failed - attempt 3",
    });

    // Should not retry after max attempts
    expect(worker.posted.length).toBe(3);
    expect(applied.length).toBe(0);

    // Telemetry should track errors and retries
    const snapshot = telemetry.getSnapshot();
    expect(snapshot.meshing.errorCount).toBe(3);
    expect(snapshot.meshing.retryCount).toBe(2); // 2 retries after first failure

    scheduler.dispose();
    resetTelemetryCollector();
  });

  it("should successfully recover from transient meshing error", () => {
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
      maxRetries: 3,
    });

    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.pump();

    const job1 = worker.posted[0]!.msg;
    if (job1.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    // First attempt fails
    worker.emit({
      t: "MESH_ERROR",
      jobId: job1.jobId,
      chunk: job1.chunk,
      rev: job1.rev,
      message: "Transient error",
    });

    // Retry succeeds
    expect(worker.posted.length).toBe(2);
    const job2 = worker.posted[1]!.msg;
    if (job2.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    worker.emit({
      t: "MESH_RESULT",
      jobId: job2.jobId,
      chunk: job2.chunk,
      rev: job2.rev,
      geometry: {
        positions: new Float32Array([1, 2, 3]),
        normals: new Float32Array([0, 1, 0]),
        indices: new Uint16Array([0, 1, 2]),
      },
    });

    // Result should be applied
    expect(applied.length).toBe(1);
    expect(applied[0]!.jobId).toBe(job2.jobId);

    scheduler.dispose();
  });

  it("should handle multiple chunks with independent retry counts", () => {
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
      maxRetries: 2,
      maxInFlight: 2,
    });

    // Mark two chunks as dirty
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 1, cy: 0, cz: 0 });
    scheduler.pump();

    expect(worker.posted.length).toBe(2);

    const job1 = worker.posted[0]!.msg;
    const job2 = worker.posted[1]!.msg;
    if (job1.t !== "MESH_CHUNK" || job2.t !== "MESH_CHUNK")
      throw new Error("expected MESH_CHUNK");

    // First chunk fails
    worker.emit({
      t: "MESH_ERROR",
      jobId: job1.jobId,
      chunk: job1.chunk,
      rev: job1.rev,
      message: "Error on chunk 1",
    });

    // Second chunk succeeds
    worker.emit({
      t: "MESH_RESULT",
      jobId: job2.jobId,
      chunk: job2.chunk,
      rev: job2.rev,
      geometry: {
        positions: new Float32Array([]),
        normals: new Float32Array([]),
        indices: new Uint16Array([]),
      },
    });

    // Should have retry for first chunk
    expect(worker.posted.length).toBe(3);
    expect(applied.length).toBe(1);
    expect(applied[0]!.jobId).toBe(job2.jobId);

    scheduler.dispose();
  });

  it("should clear retry counts on clearAll", () => {
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
      maxRetries: 3,
    });

    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.pump();

    const job1 = worker.posted[0]!.msg;
    if (job1.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    // Cause error
    worker.emit({
      t: "MESH_ERROR",
      jobId: job1.jobId,
      chunk: job1.chunk,
      rev: job1.rev,
      message: "Error",
    });

    expect(worker.posted.length).toBe(2);

    // Clear all
    scheduler.clearAll();

    // Mark same chunk again - should start fresh
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.pump();

    // Should have fresh attempts
    expect(worker.posted.length).toBe(3);

    scheduler.dispose();
  });

  it("should not retry if chunk is dirtied again during retry", () => {
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
      maxRetries: 3,
    });

    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.pump();

    const job1 = worker.posted[0]!.msg;
    if (job1.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");

    // Mark dirty again (revision increments)
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });

    // Emit error for old revision
    worker.emit({
      t: "MESH_ERROR",
      jobId: job1.jobId,
      chunk: job1.chunk,
      rev: job1.rev,
      message: "Error",
    });

    // Should schedule new job with new revision, not retry old revision
    scheduler.pump();
    expect(worker.posted.length).toBe(2);

    const job2 = worker.posted[1]!.msg;
    if (job2.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(job2.rev).toBeGreaterThan(job1.rev);

    scheduler.dispose();
  });
});
