import { describe, expect, it } from "vitest";

import { handleInstanceRebuildJob } from "../src/components/world/instancedVoxels/rebuildWorkerHandler";
import type { InstanceRebuildJob } from "../src/shared/instanceRebuildProtocol";

describe("instance rebuild worker handler", () => {
  it("should compute matrices and colors for voxel positions", () => {
    const positions = new Float32Array([0, 5, 0, 10, 15, 20]);

    const job: InstanceRebuildJob = {
      t: "REBUILD_INSTANCES",
      jobId: 42,
      positions,
      waterLevel: 8,
    };

    const result = handleInstanceRebuildJob(job);

    expect(result.t).toBe("REBUILD_RESULT");
    if (result.t !== "REBUILD_RESULT") throw new Error("expected REBUILD_RESULT");

    expect(result.jobId).toBe(42);
    expect(result.count).toBe(2); // Two voxels

    // Check matrices are Float32Arrays with correct length (16 floats per instance)
    expect(result.matrices).toBeInstanceOf(Float32Array);
    expect(result.matrices.length).toBe(2 * 16);

    // Check colors are Float32Arrays with correct length (3 floats per instance)
    expect(result.colors).toBeInstanceOf(Float32Array);
    expect(result.colors.length).toBe(2 * 3);

    // Verify first instance matrix has translation at (0, 5, 0)
    expect(result.matrices[12]).toBe(0); // x translation
    expect(result.matrices[13]).toBe(5); // y translation
    expect(result.matrices[14]).toBe(0); // z translation
    expect(result.matrices[15]).toBe(1); // w component

    // Verify second instance matrix has translation at (10, 15, 20)
    expect(result.matrices[16 + 12]).toBe(10);
    expect(result.matrices[16 + 13]).toBe(15);
    expect(result.matrices[16 + 14]).toBe(20);

    // Verify colors are valid RGB values (0-1 range)
    for (const colorValue of result.colors) {
      expect(colorValue).toBeGreaterThanOrEqual(0);
      expect(colorValue).toBeLessThanOrEqual(1);
    }
  });

  it("should handle empty positions array", () => {
    const positions = new Float32Array([]);

    const job: InstanceRebuildJob = {
      t: "REBUILD_INSTANCES",
      jobId: 1,
      positions,
      waterLevel: 0,
    };

    const result = handleInstanceRebuildJob(job);

    expect(result.t).toBe("REBUILD_RESULT");
    if (result.t !== "REBUILD_RESULT") throw new Error("expected REBUILD_RESULT");

    expect(result.count).toBe(0);
    expect(result.matrices.length).toBe(0);
    expect(result.colors.length).toBe(0);
  });

  it("should compute correct identity matrix components", () => {
    const positions = new Float32Array([1, 2, 3]);

    const job: InstanceRebuildJob = {
      t: "REBUILD_INSTANCES",
      jobId: 1,
      positions,
      waterLevel: 0,
    };

    const result = handleInstanceRebuildJob(job);

    if (result.t !== "REBUILD_RESULT") throw new Error("expected REBUILD_RESULT");

    // Verify identity matrix structure (column-major order)
    const m = result.matrices;
    expect(m[0]).toBe(1); // m11
    expect(m[1]).toBe(0); // m12
    expect(m[2]).toBe(0); // m13
    expect(m[3]).toBe(0); // m14
    expect(m[4]).toBe(0); // m21
    expect(m[5]).toBe(1); // m22
    expect(m[6]).toBe(0); // m23
    expect(m[7]).toBe(0); // m24
    expect(m[8]).toBe(0); // m31
    expect(m[9]).toBe(0); // m32
    expect(m[10]).toBe(1); // m33
    expect(m[11]).toBe(0); // m34
    expect(m[12]).toBe(1); // m41 (translation x)
    expect(m[13]).toBe(2); // m42 (translation y)
    expect(m[14]).toBe(3); // m43 (translation z)
    expect(m[15]).toBe(1); // m44
  });

  it("should return transferable typed arrays", () => {
    const positions = new Float32Array([5, 10, 15]);

    const job: InstanceRebuildJob = {
      t: "REBUILD_INSTANCES",
      jobId: 99,
      positions,
      waterLevel: 10,
    };

    const result = handleInstanceRebuildJob(job);

    if (result.t !== "REBUILD_RESULT") throw new Error("expected REBUILD_RESULT");

    // Verify the arrays have underlying ArrayBuffers (transferable)
    expect(result.matrices.buffer).toBeInstanceOf(ArrayBuffer);
    expect(result.colors.buffer).toBeInstanceOf(ArrayBuffer);
  });
});
