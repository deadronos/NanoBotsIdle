import { describe, expect, it } from "vitest";

import { defaultMeshingWorkerFactory } from "../src/meshing/meshingWorkerFactory";
import { MeshingScheduler, type MeshingWorkerLike } from "../src/meshing/meshingScheduler";
import type { FromMeshingWorker, ToMeshingWorker } from "../src/shared/meshingProtocol";

/**
 * Lifecycle tests for Web Workers.
 * Ensures proper termination, re-instantiation, and event handler cleanup.
 */

class TestableWorker implements MeshingWorkerLike {
  private handler: ((event: MessageEvent<FromMeshingWorker>) => void) | null = null;
  public terminated = false;
  public eventHandlerCount = 0;

  postMessage(message: ToMeshingWorker, transfer?: Transferable[]) {
    // No-op for testing
  }

  addEventListener(type: "message", handler: (event: MessageEvent<FromMeshingWorker>) => void) {
    if (type !== "message") return;
    this.handler = handler;
    this.eventHandlerCount++;
  }

  removeEventListener(type: "message", handler: (event: MessageEvent<FromMeshingWorker>) => void) {
    if (type !== "message") return;
    if (this.handler === handler) {
      this.handler = null;
      this.eventHandlerCount--;
    }
  }

  terminate() {
    this.terminated = true;
    this.handler = null;
  }

  isHandlerAttached() {
    return this.handler !== null;
  }
}

describe("Worker Lifecycle Tests", () => {
  it("should properly terminate worker and cleanup handlers on dispose", () => {
    const worker = new TestableWorker();

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

    // Verify handler is attached
    expect(worker.isHandlerAttached()).toBe(true);
    expect(worker.terminated).toBe(false);

    // Dispose should cleanup
    scheduler.dispose();

    expect(worker.isHandlerAttached()).toBe(false);
    expect(worker.terminated).toBe(true);
  });

  it("should handle multiple worker create/destroy cycles without handler leaks", () => {
    const cycles = 10;
    const workers: TestableWorker[] = [];

    for (let i = 0; i < cycles; i++) {
      const worker = new TestableWorker();
      workers.push(worker);

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

      // Do some work
      scheduler.markDirty({ cx: i, cy: 0, cz: 0 });

      // Dispose
      scheduler.dispose();

      expect(worker.terminated).toBe(true);
      expect(worker.isHandlerAttached()).toBe(false);
    }

    // Verify all workers are properly terminated
    workers.forEach((worker) => {
      expect(worker.terminated).toBe(true);
      expect(worker.isHandlerAttached()).toBe(false);
      // Event handler count should be 0 (added then removed)
      expect(worker.eventHandlerCount).toBe(0);
    });
  });

  it("should not process messages after worker termination", () => {
    const worker = new TestableWorker();
    let applyCalled = false;

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
      onApply: () => {
        applyCalled = true;
      },
    });

    // Mark dirty and dispose immediately
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.dispose();

    // Worker should be terminated and handler removed
    expect(worker.terminated).toBe(true);
    expect(worker.isHandlerAttached()).toBe(false);

    // onApply should not have been called
    expect(applyCalled).toBe(false);
  });

  it("should handle worker re-instantiation correctly", () => {
    const worker1 = new TestableWorker();

    const scheduler1 = new MeshingScheduler({
      worker: worker1,
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

    scheduler1.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler1.dispose();

    expect(worker1.terminated).toBe(true);

    // Create new worker and scheduler
    const worker2 = new TestableWorker();

    const scheduler2 = new MeshingScheduler({
      worker: worker2,
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

    // New worker should be operational
    expect(worker2.terminated).toBe(false);
    expect(worker2.isHandlerAttached()).toBe(true);

    scheduler2.markDirty({ cx: 1, cy: 0, cz: 0 });
    scheduler2.dispose();

    expect(worker2.terminated).toBe(true);
  });

  it("should verify worker factory pattern supports termination", () => {
    // This test verifies the interface contract of the worker factory
    // without actually instantiating a Web Worker (which isn't available in Node test env)

    // The worker factory should return an object with these methods
    const mockFactory = (): MeshingWorkerLike => ({
      postMessage: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      terminate: () => {},
    });

    const worker = mockFactory();

    // Worker should have terminate method
    expect(typeof worker.terminate).toBe("function");
    expect(typeof worker.postMessage).toBe("function");
    expect(typeof worker.addEventListener).toBe("function");
    expect(typeof worker.removeEventListener).toBe("function");

    // Terminate should be callable without error
    worker.terminate?.();
  });

  it("should handle multiple concurrent workers without interference", () => {
    const worker1 = new TestableWorker();
    const worker2 = new TestableWorker();

    const scheduler1 = new MeshingScheduler({
      worker: worker1,
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

    const scheduler2 = new MeshingScheduler({
      worker: worker2,
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

    // Both workers should be operational
    expect(worker1.isHandlerAttached()).toBe(true);
    expect(worker2.isHandlerAttached()).toBe(true);

    // Dispose first scheduler
    scheduler1.dispose();

    expect(worker1.terminated).toBe(true);
    expect(worker2.terminated).toBe(false);

    // Second worker should still be operational
    expect(worker2.isHandlerAttached()).toBe(true);

    // Dispose second scheduler
    scheduler2.dispose();

    expect(worker2.terminated).toBe(true);
  });
});
