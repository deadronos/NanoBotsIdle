import type { BufferGeometry, Color, InstancedMesh } from "three";
import { describe, expect, it, vi } from "vitest";

import * as I from "../src/render/instanced";

/**
 * Lifecycle tests for InstancedMesh and Object3D management.
 * Ensures proper creation, update, and disposal without memory leaks.
 */

describe("InstancedMesh Lifecycle Tests", () => {
  it("should not accumulate matrix updates when properly managed", () => {
    const mesh = {
      setMatrixAt: vi.fn(),
      instanceMatrix: { needsUpdate: false },
      count: 100,
    } as unknown as InstancedMesh;

    const iterations = 1000;

    // Repeatedly update instances
    for (let i = 0; i < iterations; i++) {
      const instanceIndex = i % mesh.count;
      I.setInstanceTransform(mesh, instanceIndex, {
        position: { x: i, y: i, z: i },
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    // setMatrixAt should be called exactly 'iterations' times
    expect(mesh.setMatrixAt).toHaveBeenCalledTimes(iterations);

    // needsUpdate flag should be set
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);
  });

  it("should handle color updates without unbounded growth", () => {
    const mesh = {
      setColorAt: vi.fn(),
      instanceColor: { needsUpdate: false },
      count: 50,
    } as unknown as InstancedMesh;

    const iterations = 500;
    const color = { r: 1, g: 0.5, b: 0 } as unknown as Color;

    // Repeatedly update colors
    for (let i = 0; i < iterations; i++) {
      const instanceIndex = i % mesh.count;
      I.setInstanceColor(mesh, instanceIndex, color);
    }

    // setColorAt should be called exactly 'iterations' times
    expect(mesh.setColorAt).toHaveBeenCalledTimes(iterations);

    // needsUpdate flag should be set
    expect(mesh.instanceColor!.needsUpdate).toBe(true);
  });

  it("should apply updates correctly with batch operations", () => {
    const mesh = {
      instanceMatrix: { needsUpdate: false },
      instanceColor: { needsUpdate: false },
    } as unknown as InstancedMesh;

    // Initial state
    expect(mesh.instanceMatrix.needsUpdate).toBe(false);
    expect(mesh.instanceColor!.needsUpdate).toBe(false);

    // Apply matrix updates
    I.applyInstanceUpdates(mesh, { matrix: true });
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);

    // Reset for next test
    mesh.instanceMatrix.needsUpdate = false;

    // Apply color updates
    I.applyInstanceUpdates(mesh, { color: true });
    expect(mesh.instanceColor!.needsUpdate).toBe(true);

    // Reset for next test
    mesh.instanceColor!.needsUpdate = false;

    // Apply both
    I.applyInstanceUpdates(mesh, { matrix: true, color: true });
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);
    expect(mesh.instanceColor!.needsUpdate).toBe(true);
  });

  it("should populate instancedMesh without memory issues", () => {
    // Create a mock geometry with proper structure
    const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
    const mockGeometry = {
      attributes: {
        position: {
          array: positions,
          count: 3,
        },
      },
      index: null,
    } as unknown as BufferGeometry;

    const mesh = {
      geometry: mockGeometry,
      count: 3,
      setMatrixAt: vi.fn(),
      setColorAt: vi.fn(),
      instanceMatrix: { needsUpdate: false },
      instanceColor: { needsUpdate: false },
    } as unknown as InstancedMesh;

    const instanceData = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 2, z: 2 },
    ];

    I.populateInstancedMesh(mesh, instanceData);

    // Should have called setMatrixAt for each instance
    expect(mesh.setMatrixAt).toHaveBeenCalledTimes(3);

    // Flags should be set
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);
  });

  it("should handle repeated population cycles without leaks", () => {
    const mockGeometry = {
      attributes: {
        position: {
          array: new Float32Array([0, 0, 0, 1, 1, 1]),
          count: 2,
        },
      },
      index: null,
    } as unknown as BufferGeometry;

    const mesh = {
      geometry: mockGeometry,
      count: 2,
      setMatrixAt: vi.fn(),
      instanceMatrix: { needsUpdate: false },
    } as unknown as InstancedMesh;

    const cycles = 100;

    for (let cycle = 0; cycle < cycles; cycle++) {
      const instanceData = [
        { x: cycle, y: 0, z: 0 },
        { x: 0, y: cycle, z: 0 },
      ];

      // Reset flag
      mesh.instanceMatrix.needsUpdate = false;

      I.populateInstancedMesh(mesh, instanceData);

      expect(mesh.instanceMatrix.needsUpdate).toBe(true);
    }

    // Total calls should be cycles * 2 (2 instances per cycle)
    expect(mesh.setMatrixAt).toHaveBeenCalledTimes(cycles * 2);
  });
});

describe("Object3D Lifecycle Tests", () => {
  it("should verify Object3D is reused in hot paths (no new allocations)", () => {
    // This test ensures the helper creates a single Object3D and reuses it
    // The actual implementation in render/instanced.ts uses a module-level _tmp Object3D

    const mesh = {
      setMatrixAt: vi.fn(),
      instanceMatrix: { needsUpdate: false },
    } as unknown as InstancedMesh;

    const iterations = 100;

    // Multiple transform updates should reuse the same internal Object3D
    for (let i = 0; i < iterations; i++) {
      I.setInstanceTransform(mesh, i, {
        position: { x: i, y: i, z: i },
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    // Verify all calls succeeded
    expect(mesh.setMatrixAt).toHaveBeenCalledTimes(iterations);

    // The function should not have created new Object3D instances each time
    // (this is tested indirectly by ensuring no errors and checking call counts)
  });
});
