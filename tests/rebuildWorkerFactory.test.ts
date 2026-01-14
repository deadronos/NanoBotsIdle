import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createInstanceRebuildWorker,
  type InstanceRebuildWorkerLike,
} from "../src/components/world/instancedVoxels/rebuildWorkerFactory";

type WorkerCtorArgs = [unknown, { type: string }];

class MockWorker {
  static lastCtorArgs: WorkerCtorArgs | null = null;
  static lastPostMessage: { message: unknown; transfer?: Transferable[] } | null = null;
  static lastAddListener: { type: string; handler: EventListener } | null = null;
  static lastRemoveListener: { type: string; handler: EventListener } | null = null;
  static terminated = false;

  constructor(url: unknown, options: { type: string }) {
    MockWorker.lastCtorArgs = [url, options];
  }

  postMessage(message: unknown, transfer?: Transferable[]) {
    MockWorker.lastPostMessage = { message, transfer };
  }

  addEventListener(type: string, handler: EventListener) {
    MockWorker.lastAddListener = { type, handler };
  }

  removeEventListener(type: string, handler: EventListener) {
    MockWorker.lastRemoveListener = { type, handler };
  }

  terminate() {
    MockWorker.terminated = true;
  }
}

describe("createInstanceRebuildWorker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    MockWorker.lastCtorArgs = null;
    MockWorker.lastPostMessage = null;
    MockWorker.lastAddListener = null;
    MockWorker.lastRemoveListener = null;
    MockWorker.terminated = false;
  });

  it("wraps Worker with a WorkerLike interface", () => {
    vi.stubGlobal("Worker", MockWorker as never);

    const w: InstanceRebuildWorkerLike = createInstanceRebuildWorker();

    expect(MockWorker.lastCtorArgs).not.toBeNull();
    const [url, options] = MockWorker.lastCtorArgs as WorkerCtorArgs;

    expect(url).toBeInstanceOf(URL);
    expect(String(url)).toContain("instanceRebuild.worker.ts");
    expect(options).toEqual({ type: "module" });

    w.postMessage({
      t: "REBUILD_INSTANCES",
      jobId: 1,
      positions: new Float32Array(),
      waterLevel: 0,
    });
    expect(MockWorker.lastPostMessage?.transfer).toBeUndefined();

    const transfer = [new ArrayBuffer(8)];
    w.postMessage(
      { t: "REBUILD_INSTANCES", jobId: 2, positions: new Float32Array(), waterLevel: 0 },
      transfer,
    );
    expect(MockWorker.lastPostMessage?.transfer).toBe(transfer);

    const handler = vi.fn();
    w.addEventListener("message", handler as never);
    expect(MockWorker.lastAddListener?.type).toBe("message");

    w.removeEventListener("message", handler as never);
    expect(MockWorker.lastRemoveListener?.type).toBe("message");

    w.terminate();
    expect(MockWorker.terminated).toBe(true);
  });
});
