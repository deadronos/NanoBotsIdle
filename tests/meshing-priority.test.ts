import { describe, expect, it } from "vitest";

import { MeshingScheduler, type MeshingWorkerLike } from "../src/meshing/meshingScheduler";
import type { FromMeshingWorker, ToMeshingWorker } from "../src/shared/meshingProtocol";

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

describe("MeshingScheduler priority", () => {
  it("prefers near chunks even if enqueued later", () => {
    const worker = new FakeMeshingWorker();
    const focus = { cx: 0, cy: 0, cz: 0 };

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 1,
      getPriority: (coord) => {
        const dx = coord.cx - focus.cx;
        const dy = coord.cy - focus.cy;
        const dz = coord.cz - focus.cz;
        return dx * dx + dy * dy + dz * dz;
      },
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

    // Far enqueued first
    scheduler.markDirty({ cx: 10, cy: 0, cz: 0 });
    // Near enqueued later
    scheduler.markDirty({ cx: 1, cy: 0, cz: 0 });

    scheduler.pump();
    expect(worker.posted.length).toBe(1);
    const msg = worker.posted[0]!.msg;
    if (msg.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(msg.chunk.cx).toBe(1);

    scheduler.dispose();
  });

  it("can reprioritize already-dirty chunks when focus moves (player move)", () => {
    const worker = new FakeMeshingWorker();
    const focus = { cx: 0, cy: 0, cz: 0 };

    const scheduler = new MeshingScheduler({
      worker,
      chunkSize: 16,
      maxInFlight: 1,
      getPriority: (coord) => {
        const dx = coord.cx - focus.cx;
        const dy = coord.cy - focus.cy;
        const dz = coord.cz - focus.cz;
        return dx * dx + dy * dy + dz * dz;
      },
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

    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.markDirty({ cx: 10, cy: 0, cz: 0 });

    // Simulate player moving near the far chunk
    focus.cx = 10;
    scheduler.reprioritizeDirty();

    scheduler.pump();
    expect(worker.posted.length).toBe(1);
    const msg = worker.posted[0]!.msg;
    if (msg.t !== "MESH_CHUNK") throw new Error("expected MESH_CHUNK");
    expect(msg.chunk.cx).toBe(10);

    scheduler.dispose();
  });
});
