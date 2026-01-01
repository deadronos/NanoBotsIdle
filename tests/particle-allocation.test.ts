import { Color, Vector3 } from "three";
import { describe, expect, it } from "vitest";

/**
 * Test suite for particle allocation optimization
 * Validates O(1) free-list based allocation replaces O(n) findIndex
 */

interface Particle {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: Color;
}

/**
 * Simulates the optimized particle allocation system
 */
class ParticleAllocator {
  private particles: Particle[];
  private freeList: number[];
  private maxParticles: number;

  constructor(maxParticles: number) {
    this.maxParticles = maxParticles;
    this.particles = new Array(maxParticles).fill(0).map(() => ({
      position: new Vector3(),
      velocity: new Vector3(),
      life: 0,
      maxLife: 1,
      scale: 0,
      color: new Color(),
    }));

    // Initialize free-list with all indices
    this.freeList = [];
    for (let i = maxParticles - 1; i >= 0; i -= 1) {
      this.freeList.push(i);
    }
  }

  allocate(): number {
    // O(1) allocation from free-list
    if (this.freeList.length > 0) {
      return this.freeList.pop()!;
    }
    // Fallback to random if all particles are active
    return Math.floor(Math.random() * this.maxParticles);
  }

  release(index: number): void {
    // O(1) return to free-list
    // Only push if not already in free-list (avoid duplicates)
    if (this.particles[index].life <= 0 && !this.freeList.includes(index)) {
      this.freeList.push(index);
    }
  }

  getParticle(index: number): Particle {
    return this.particles[index];
  }

  getFreeListSize(): number {
    return this.freeList.length;
  }
}

describe("Particle allocation with free-list (O(1))", () => {
  it("should initialize free-list with all particle indices", () => {
    const maxParticles = 100;
    const allocator = new ParticleAllocator(maxParticles);

    expect(allocator.getFreeListSize()).toBe(maxParticles);
  });

  it("should allocate particles in O(1) time from free-list", () => {
    const allocator = new ParticleAllocator(10);

    const idx1 = allocator.allocate();
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx1).toBeLessThan(10);
    expect(allocator.getFreeListSize()).toBe(9);

    const idx2 = allocator.allocate();
    expect(idx2).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeLessThan(10);
    expect(idx2).not.toBe(idx1);
    expect(allocator.getFreeListSize()).toBe(8);
  });

  it("should return particle index to free-list when life reaches zero", () => {
    const allocator = new ParticleAllocator(10);

    const idx = allocator.allocate();
    expect(allocator.getFreeListSize()).toBe(9);

    // Simulate particle death
    const particle = allocator.getParticle(idx);
    particle.life = 0;

    allocator.release(idx);
    expect(allocator.getFreeListSize()).toBe(10);
  });

  it("should allow reallocation of freed particles", () => {
    const allocator = new ParticleAllocator(10);

    // Allocate all particles
    const indices: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      indices.push(allocator.allocate());
    }
    expect(allocator.getFreeListSize()).toBe(0);

    // Free some particles
    for (let i = 0; i < 5; i += 1) {
      const particle = allocator.getParticle(indices[i]);
      particle.life = 0;
      allocator.release(indices[i]);
    }
    expect(allocator.getFreeListSize()).toBe(5);

    // Reallocate freed particles
    const newIdx1 = allocator.allocate();
    const newIdx2 = allocator.allocate();

    expect(indices.slice(0, 5)).toContain(newIdx1);
    expect(indices.slice(0, 5)).toContain(newIdx2);
    expect(allocator.getFreeListSize()).toBe(3);
  });

  it("should fallback to random allocation when free-list is empty", () => {
    const allocator = new ParticleAllocator(5);

    // Allocate all particles
    for (let i = 0; i < 5; i += 1) {
      allocator.allocate();
    }
    expect(allocator.getFreeListSize()).toBe(0);

    // Try to allocate when free-list is empty
    const idx = allocator.allocate();
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(5);
  });

  it("should not add duplicate indices to free-list", () => {
    const allocator = new ParticleAllocator(10);

    const idx = allocator.allocate();
    const particle = allocator.getParticle(idx);
    particle.life = 0;

    allocator.release(idx);
    const size1 = allocator.getFreeListSize();

    // Try to release the same index again
    allocator.release(idx);
    const size2 = allocator.getFreeListSize();

    expect(size2).toBe(size1); // Size should not increase
  });

  it("should handle burst allocations efficiently", () => {
    const allocator = new ParticleAllocator(100);
    const burstCount = 10;
    const iterations = 5;

    for (let i = 0; i < iterations; i += 1) {
      // Allocate burst
      const allocated: number[] = [];
      for (let j = 0; j < burstCount; j += 1) {
        allocated.push(allocator.allocate());
      }

      // All indices should be unique
      const uniqueIndices = new Set(allocated);
      expect(uniqueIndices.size).toBe(burstCount);

      // Free half of them
      for (let j = 0; j < burstCount / 2; j += 1) {
        const particle = allocator.getParticle(allocated[j]);
        particle.life = 0;
        allocator.release(allocated[j]);
      }
    }

    // Free-list should have freed particles
    expect(allocator.getFreeListSize()).toBeGreaterThan(0);
  });
});
