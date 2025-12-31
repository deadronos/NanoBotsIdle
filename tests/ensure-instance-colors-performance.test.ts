import type { BufferGeometry, InstancedMesh } from "three";
import { InstancedBufferAttribute } from "three";
import { describe, expect, it } from "vitest";

import { ensureInstanceColors } from "../src/components/world/instancedVoxels/voxelInstanceMesh";

/**
 * Performance benchmarks for ensureInstanceColors optimization.
 * Measures allocation count and efficiency of buffer reuse.
 */
describe("ensureInstanceColors performance benchmarks", () => {
  const createMockMesh = (initialCapacity = 0): InstancedMesh => {
    const geometry = {
      setAttribute: () => undefined,
      getAttribute: (name: string) => {
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
        initialCapacity > 0
          ? new InstancedBufferAttribute(
              new Float32Array(initialCapacity * 3).fill(1),
              3,
            )
          : undefined,
    } as unknown as InstancedMesh;

    if (mesh.instanceColor) {
      mesh.instanceColor.count = initialCapacity;
    }

    return mesh;
  };

  it("benchmark: realistic world growth pattern", () => {
    const mesh = createMockMesh();
    let allocationCount = 0;
    let lastBuffer: Float32Array | undefined;

    // Simulate realistic world expansion:
    // Starting small and growing by 1.5x each time (as in useInstancedVoxels)
    const capacities = [512, 768, 1152, 1728, 2592, 3888, 5832, 8748, 13122];

    for (const capacity of capacities) {
      ensureInstanceColors(mesh, capacity);
      const currentBuffer = mesh.instanceColor!.array;

      if (currentBuffer !== lastBuffer) {
        allocationCount++;
        lastBuffer = currentBuffer;
      }
    }

    // With power-of-two growth, we should have significantly fewer allocations
    // than the number of capacity changes (9 in this case)
    console.log(
      `\n  📊 Realistic growth allocations: ${allocationCount} / ${capacities.length} capacity changes`,
    );
    console.log(
      `  💾 Final buffer size: ${mesh.instanceColor!.array.length / 3} (capacity: ${mesh.instanceColor!.count})`,
    );
    console.log(
      `  ✨ Efficiency: ${((1 - allocationCount / capacities.length) * 100).toFixed(1)}% fewer allocations`,
    );

    // Should be at most 7 allocations for this growth pattern (6 is typical)
    expect(allocationCount).toBeLessThanOrEqual(7);
  });

  it("benchmark: frequent small increases", () => {
    const mesh = createMockMesh();
    let allocationCount = 0;
    let lastBuffer: Float32Array | undefined;

    // Simulate frequent small increases (worst case for old implementation)
    let capacity = 100;
    const steps = 50;

    for (let i = 0; i < steps; i++) {
      capacity += 10; // Small increments
      ensureInstanceColors(mesh, capacity);
      const currentBuffer = mesh.instanceColor!.array;

      if (currentBuffer !== lastBuffer) {
        allocationCount++;
        lastBuffer = currentBuffer;
      }
    }

    console.log(
      `\n  📊 Small increments allocations: ${allocationCount} / ${steps} capacity changes`,
    );
    console.log(
      `  💾 Final buffer size: ${mesh.instanceColor!.array.length / 3} (capacity: ${mesh.instanceColor!.count})`,
    );
    console.log(
      `  ✨ Efficiency: ${((1 - allocationCount / steps) * 100).toFixed(1)}% fewer allocations`,
    );

    // With power-of-two growth, should be much fewer than 50 allocations
    // Expect at most 4 allocations for this range (128 -> 256 -> 512 -> 1024)
    expect(allocationCount).toBeLessThanOrEqual(4);
  });

  it("benchmark: buffer reuse on decrease", () => {
    const mesh = createMockMesh();

    // Grow to large capacity
    ensureInstanceColors(mesh, 10000);
    const bufferAfterGrowth = mesh.instanceColor!.array;

    // Decrease capacity multiple times
    let reuseCount = 0;
    for (let capacity = 9000; capacity > 5000; capacity -= 500) {
      ensureInstanceColors(mesh, capacity);
      if (mesh.instanceColor!.array === bufferAfterGrowth) {
        reuseCount++;
      }
    }

    console.log(`\n  📊 Buffer reuse on decrease: ${reuseCount} / 9 decrements`);
    console.log(`  ✨ Reuse rate: ${((reuseCount / 9) * 100).toFixed(1)}%`);

    // Most decreases should reuse the same buffer (at least 80%)
    expect(reuseCount).toBeGreaterThanOrEqual(7); // 7/9 = 78%
  });

  it("benchmark: color data preservation during growth", () => {
    const mesh = createMockMesh(100);

    // Set unique colors for first 10 instances
    const originalColors: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = Math.random();
      const g = Math.random();
      const b = Math.random();
      mesh.instanceColor!.array[i * 3 + 0] = r;
      mesh.instanceColor!.array[i * 3 + 1] = g;
      mesh.instanceColor!.array[i * 3 + 2] = b;
      originalColors.push(r, g, b);
    }

    // Grow capacity multiple times
    const growthSteps = [200, 500, 1000, 2000, 5000];
    let preservationErrors = 0;

    for (const capacity of growthSteps) {
      ensureInstanceColors(mesh, capacity);

      // Verify original colors are preserved
      for (let i = 0; i < 10; i++) {
        const r = mesh.instanceColor!.array[i * 3 + 0];
        const g = mesh.instanceColor!.array[i * 3 + 1];
        const b = mesh.instanceColor!.array[i * 3 + 2];

        if (
          Math.abs(r - originalColors[i * 3 + 0]) > 0.0001 ||
          Math.abs(g - originalColors[i * 3 + 1]) > 0.0001 ||
          Math.abs(b - originalColors[i * 3 + 2]) > 0.0001
        ) {
          preservationErrors++;
        }
      }
    }

    console.log(
      `\n  📊 Color preservation: ${growthSteps.length * 10 - preservationErrors} / ${growthSteps.length * 10} checks`,
    );
    console.log(
      `  ✨ Accuracy: ${(((growthSteps.length * 10 - preservationErrors) / (growthSteps.length * 10)) * 100).toFixed(1)}%`,
    );

    expect(preservationErrors).toBe(0);
  });

  it("benchmark: comparison with naive reallocation", () => {
    // Simulate what the OLD implementation would do (always reallocate)
    const naiveAllocations = (capacities: number[]): number => {
      return capacities.length; // Always allocates on change
    };

    // Count what our NEW implementation does
    const optimizedAllocations = (capacities: number[]): number => {
      const mesh = createMockMesh();
      let count = 0;
      let lastBuffer: Float32Array | undefined;

      for (const capacity of capacities) {
        ensureInstanceColors(mesh, capacity);
        if (mesh.instanceColor!.array !== lastBuffer) {
          count++;
          lastBuffer = mesh.instanceColor!.array;
        }
      }

      return count;
    };

    const testPattern = [100, 150, 225, 337, 505, 757, 1135, 1702, 2553];

    const naive = naiveAllocations(testPattern);
    const optimized = optimizedAllocations(testPattern);
    const improvement = ((naive - optimized) / naive) * 100;

    console.log(`\n  📊 Allocation comparison:`);
    console.log(`     Old (naive): ${naive} allocations`);
    console.log(`     New (optimized): ${optimized} allocations`);
    console.log(`     Improvement: ${improvement.toFixed(1)}% reduction`);

    expect(optimized).toBeLessThan(naive);
    expect(improvement).toBeGreaterThan(25); // At least 25% reduction
  });
});
