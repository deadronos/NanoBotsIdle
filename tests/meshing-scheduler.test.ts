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
});
