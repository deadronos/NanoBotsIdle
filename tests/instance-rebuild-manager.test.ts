import { describe, expect, it } from "vitest";

import { InstanceRebuildManager } from "../src/components/world/instancedVoxels/rebuildManager";
import type { InstanceRebuildWorkerLike } from "../src/components/world/instancedVoxels/rebuildWorkerFactory";
import { handleInstanceRebuildJob } from "../src/components/world/instancedVoxels/rebuildWorkerHandler";
import type {
  FromInstanceRebuildWorker,
  ToInstanceRebuildWorker,
} from "../src/shared/instanceRebuildProtocol";

/**
 * Mock worker that processes jobs synchronously using the worker handler
 */
class MockInstanceRebuildWorker implements InstanceRebuildWorkerLike {
  private handler?: (event: MessageEvent<FromInstanceRebuildWorker>) => void;

  postMessage(message: ToInstanceRebuildWorker, _transfer?: Transferable[]): void {
    // Simulate worker processing
    setTimeout(() => {
      const result = handleInstanceRebuildJob(message);
      if (this.handler) {
        this.handler(new MessageEvent("message", { data: result }));
      }
    }, 10);
  }

  addEventListener(
    _type: "message",
    handler: (event: MessageEvent<FromInstanceRebuildWorker>) => void,
  ): void {
    this.handler = handler;
  }

  removeEventListener(
    _type: "message",
    _handler: (event: MessageEvent<FromInstanceRebuildWorker>) => void,
  ): void {
    this.handler = undefined;
  }

  terminate(): void {
    this.handler = undefined;
  }
}

describe("InstanceRebuildManager integration", () => {
  it("should request rebuild and receive computed matrices and colors", async () => {
    const mockWorker = new MockInstanceRebuildWorker();
    const manager = new InstanceRebuildManager(mockWorker);

    const positions = [0, 5, 0, 10, 15, 20, 5, 10, 5];
    const waterLevel = 8;

    const result = await manager.requestRebuild(positions, waterLevel);

    expect(result.count).toBe(3);
    expect(result.matrices).toBeInstanceOf(Float32Array);
    expect(result.matrices.length).toBe(3 * 16); // 3 instances * 16 floats per matrix
    expect(result.colors).toBeInstanceOf(Float32Array);
    expect(result.colors.length).toBe(3 * 3); // 3 instances * 3 floats per color

    // Verify first instance matrix has correct translation
    expect(result.matrices[12]).toBe(0); // x
    expect(result.matrices[13]).toBe(5); // y
    expect(result.matrices[14]).toBe(0); // z

    // Verify colors are in valid range
    for (const colorValue of result.colors) {
      expect(colorValue).toBeGreaterThanOrEqual(0);
      expect(colorValue).toBeLessThanOrEqual(1);
    }

    manager.terminate();
  });

  it("should handle empty positions", async () => {
    const mockWorker = new MockInstanceRebuildWorker();
    const manager = new InstanceRebuildManager(mockWorker);

    const result = await manager.requestRebuild([], 0);

    expect(result.count).toBe(0);
    expect(result.matrices.length).toBe(0);
    expect(result.colors.length).toBe(0);

    manager.terminate();
  });

  it("should handle multiple concurrent requests", async () => {
    const mockWorker = new MockInstanceRebuildWorker();
    const manager = new InstanceRebuildManager(mockWorker);

    const positions1 = [0, 0, 0];
    const positions2 = [10, 10, 10, 20, 20, 20];
    const positions3 = [5, 5, 5, 15, 15, 15, 25, 25, 25];

    const [result1, result2, result3] = await Promise.all([
      manager.requestRebuild(positions1, 5),
      manager.requestRebuild(positions2, 10),
      manager.requestRebuild(positions3, 15),
    ]);

    expect(result1.count).toBe(1);
    expect(result2.count).toBe(2);
    expect(result3.count).toBe(3);

    manager.terminate();
  });

  it("should transfer typed arrays (verifying transferable capability)", async () => {
    const mockWorker = new MockInstanceRebuildWorker();
    const manager = new InstanceRebuildManager(mockWorker);

    const positions = [1, 2, 3, 4, 5, 6];
    const result = await manager.requestRebuild(positions, 5);

    // Verify the result contains typed arrays with underlying buffers
    expect(result.matrices.buffer).toBeInstanceOf(ArrayBuffer);
    expect(result.colors.buffer).toBeInstanceOf(ArrayBuffer);

    // Verify the buffers have the expected sizes
    expect(result.matrices.buffer.byteLength).toBe(2 * 16 * 4); // 2 instances * 16 floats * 4 bytes
    expect(result.colors.buffer.byteLength).toBe(2 * 3 * 4); // 2 instances * 3 floats * 4 bytes

    manager.terminate();
  });
});
