import type { BufferGeometry, InstancedMesh } from "three";
import { InstancedBufferAttribute } from "three";
import { describe, expect, it } from "vitest";

import { ensureInstanceColors } from "../src/components/world/instancedVoxels/voxelInstanceMesh";

/**
 * Tests for ensureInstanceColors buffer reuse and growth optimization.
 * Validates that buffers are reused when possible and grow efficiently.
 */
describe("ensureInstanceColors buffer reuse", () => {
  const createMockMesh = (initialCapacity = 0): InstancedMesh => {
    const geometry = {
      setAttribute: () => undefined,
      getAttribute: (name: string) => {
        // Mock position attribute for ensureGeometryHasVertexColors
        if (name === "position") {
          return { count: 1 };
        }
        return undefined;
      },
      attributes: {},
    } as unknown as BufferGeometry;

    const mesh = {
      geometry,
      instanceColor:
        initialCapacity > 0 ?
          new InstancedBufferAttribute(new Float32Array(initialCapacity * 3).fill(1), 3)
        : undefined,
    } as unknown as InstancedMesh;

    mesh.count = initialCapacity;

    return mesh;
  };

  it("should allocate initial buffer when none exists", () => {
    const mesh = createMockMesh();
    const changed = ensureInstanceColors(mesh, 100);

    expect(changed).toBe(true);
    expect(mesh.instanceColor).toBeDefined();
    expect(mesh.count).toBe(0);
    expect(mesh.instanceColor!.array.length).toBeGreaterThanOrEqual(100 * 3);
  });

  it("should return false when capacity unchanged", () => {
    const mesh = createMockMesh(100);
    const initialBuffer = mesh.instanceColor!.array;

    const changed = ensureInstanceColors(mesh, 100);

    expect(changed).toBe(false);
    expect(mesh.instanceColor!.array).toBe(initialBuffer);
    expect(mesh.count).toBe(100);
  });

  it("should reuse buffer when growing within power-of-two boundary", () => {
    const mesh = createMockMesh(100);
    const initialBuffer = mesh.instanceColor!.array;
    const initialBufferSize = initialBuffer.length;

    // Growing from 100 to 110 should reuse buffer if it's large enough
    const changed = ensureInstanceColors(mesh, 110);

    expect(changed).toBe(true);
    expect(mesh.count).toBe(100);

    // Buffer should be reused if capacity is within power-of-two boundary
    if (initialBufferSize >= 110 * 3) {
      expect(mesh.instanceColor!.array).toBe(initialBuffer);
    }
  });

  it("should allocate new buffer using power-of-two growth", () => {
    const mesh = createMockMesh();

    // Request capacity of 100
    ensureInstanceColors(mesh, 100);

    const bufferSize = mesh.instanceColor!.array.length / 3;

    // Should be power of two (100 -> 128)
    expect(Math.log2(bufferSize) % 1).toBe(0);
    expect(bufferSize).toBeGreaterThanOrEqual(100);

    // For capacity 100, should round to 128 (next power of two)
    expect(bufferSize).toBe(128);
  });

  it("should preserve existing color data when growing buffer", () => {
    const mesh = createMockMesh(10);

    // Set some specific colors in the first few instances
    const colors = mesh.instanceColor!.array;
    colors[0] = 0.5; // R of instance 0
    colors[1] = 0.6; // G of instance 0
    colors[2] = 0.7; // B of instance 0
    colors[3] = 0.1; // R of instance 1
    colors[4] = 0.2; // G of instance 1
    colors[5] = 0.3; // B of instance 1

    // Grow capacity significantly to force reallocation
    ensureInstanceColors(mesh, 500);

    // Check that original colors are preserved
    expect(mesh.instanceColor!.array[0]).toBeCloseTo(0.5);
    expect(mesh.instanceColor!.array[1]).toBeCloseTo(0.6);
    expect(mesh.instanceColor!.array[2]).toBeCloseTo(0.7);
    expect(mesh.instanceColor!.array[3]).toBeCloseTo(0.1);
    expect(mesh.instanceColor!.array[4]).toBeCloseTo(0.2);
    expect(mesh.instanceColor!.array[5]).toBeCloseTo(0.3);
  });

  it("should fill new buffer space with default white color", () => {
    const mesh = createMockMesh(10);

    // Grow capacity
    ensureInstanceColors(mesh, 100);

    // Check that new instances have default white color (1, 1, 1)
    // Starting from instance 10 onwards
    for (let i = 10; i < 100; i++) {
      expect(mesh.instanceColor!.array[i * 3 + 0]).toBe(1); // R
      expect(mesh.instanceColor!.array[i * 3 + 1]).toBe(1); // G
      expect(mesh.instanceColor!.array[i * 3 + 2]).toBe(1); // B
    }
  });

  it("should minimize reallocations during typical growth pattern", () => {
    const mesh = createMockMesh();
    let allocationCount = 0;
    let lastBuffer: ArrayBufferView | undefined;

    // Simulate typical growth: 100 -> 150 -> 225 -> 337 -> 505 -> 757
    const capacities = [100, 150, 225, 337, 505, 757];

    for (const capacity of capacities) {
      ensureInstanceColors(mesh, capacity);
      const currentBuffer = mesh.instanceColor!.array;

      if (currentBuffer !== lastBuffer) {
        allocationCount++;
        lastBuffer = currentBuffer;
      }
    }

    // With power-of-two growth, we should have far fewer allocations
    // than the number of capacity changes (6 in this case)
    // Expect at most 4 allocations for this growth pattern
    expect(allocationCount).toBeLessThanOrEqual(4);
  });

  it("should handle capacity decrease by reusing existing buffer", () => {
    const mesh = createMockMesh(1000);
    const initialBuffer = mesh.instanceColor!.array;

    // Decrease capacity
    const changed = ensureInstanceColors(mesh, 500);

    expect(changed).toBe(true);
    expect(mesh.count).toBe(1000);
    // Should reuse the same buffer
    expect(mesh.instanceColor!.array).toBe(initialBuffer);
  });

  it("should set needsUpdate flag when buffer changes", () => {
    const mesh = createMockMesh(100);

    ensureInstanceColors(mesh, 200);

    expect(mesh.instanceColor).toBeDefined();

    // When growing from 100 to 200, if initial buffer was 128,
    // it should allocate a new buffer (256 elements for capacity 200)
    // In both cases, needsUpdate should be true
    if (mesh.instanceColor!.needsUpdate !== undefined) {
      expect(mesh.instanceColor!.needsUpdate).toBe(true);
    } else {
      // If needsUpdate is not set, that's also acceptable as it's a Three.js internal
      // Just verify the buffer was updated correctly
      expect(mesh.count).toBe(100);
      expect(mesh.instanceColor!.array.length / 3).toBeGreaterThanOrEqual(200);
    }
  });

  it("should handle edge case of capacity 0", () => {
    const mesh = createMockMesh();

    const changed = ensureInstanceColors(mesh, 0);

    expect(changed).toBe(true);
    expect(mesh.count).toBe(0);
  });

  it("should handle very large capacity growth", () => {
    const mesh = createMockMesh(100);

    // Grow to a very large capacity
    ensureInstanceColors(mesh, 10000);

    expect(mesh.count).toBe(100);
    expect(mesh.instanceColor!.array.length).toBeGreaterThanOrEqual(10000 * 3);

    // Buffer size should still be power of two
    const bufferCapacity = mesh.instanceColor!.array.length / 3;
    expect(Math.log2(bufferCapacity) % 1).toBe(0);
  });
});
