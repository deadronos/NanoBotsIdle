import { describe, expect, it } from "vitest";

import {
  createBVXWorld,
  createChunk,
  createDemoWorld,
  emptyVoxelInChunk,
  fillVoxelInChunk,
  getBVXNormals,
  getBVXUV,
  getBVXVertices,
  getChunkPopulation,
  getVoxelInChunk,
  setVoxelInChunk,
  worldToChunkLocal,
} from "../src/shared/bvxIntegration";

describe("bvx-kit integration", () => {
  it("creates a VoxelWorld", () => {
    const world = createBVXWorld();
    expect(world).toBeDefined();
  });

  it("creates and inserts chunks", () => {
    const world = createBVXWorld();
    const chunk = createChunk(0, 0, 0);
    expect(chunk).toBeDefined();

    world.insert(chunk);
    const retrieved = world.get(chunk.key);
    expect(retrieved).toBe(chunk);
  });

  it("sets and gets voxels in a chunk", () => {
    const chunk = createChunk(0, 0, 0);

    // Initially all voxels should be off
    expect(getVoxelInChunk(chunk, 0, 0, 0)).toBe(false);

    // Set a voxel
    setVoxelInChunk(chunk, 0, 0, 0, true);
    expect(getVoxelInChunk(chunk, 0, 0, 0)).toBe(true);

    // Unset it
    setVoxelInChunk(chunk, 0, 0, 0, false);
    expect(getVoxelInChunk(chunk, 0, 0, 0)).toBe(false);
  });

  it("fills and empties voxels", () => {
    const chunk = createChunk(0, 0, 0);

    // Fill a voxel (sets all 64 bitvoxels in the 4x4x4 voxel)
    fillVoxelInChunk(chunk, 0, 0, 0);
    expect(chunk.length).toBeGreaterThan(0);

    const lengthAfterFill = chunk.length;

    // Empty it
    emptyVoxelInChunk(chunk, 0, 0, 0);
    expect(chunk.length).toBe(lengthAfterFill - 64); // Should have removed 64 bitvoxels
  });

  it("gets chunk population", () => {
    const chunk = createChunk(0, 0, 0);

    expect(getChunkPopulation(chunk)).toBe(0);

    fillVoxelInChunk(chunk, 0, 0, 0);
    expect(getChunkPopulation(chunk)).toBe(64); // One filled voxel = 64 bitvoxels
  });

  it("converts world coords to chunk and local coords", () => {
    // Test at origin
    const result1 = worldToChunkLocal(0, 0, 0);
    expect(result1.cx).toBe(0);
    expect(result1.cy).toBe(0);
    expect(result1.cz).toBe(0);
    expect(result1.lx).toBe(0);
    expect(result1.ly).toBe(0);
    expect(result1.lz).toBe(0);

    // Test positive coordinates
    const result2 = worldToChunkLocal(20, 30, 40);
    expect(result2.cx).toBe(1); // 20 / 16 = 1
    expect(result2.cy).toBe(1); // 30 / 16 = 1
    expect(result2.cz).toBe(2); // 40 / 16 = 2
    expect(result2.lx).toBe(4); // 20 % 16 = 4
    expect(result2.ly).toBe(14); // 30 % 16 = 14
    expect(result2.lz).toBe(8); // 40 % 16 = 8

    // Test negative coordinates
    const result3 = worldToChunkLocal(-5, -10, -15);
    expect(result3.cx).toBe(-1);
    expect(result3.cy).toBe(-1);
    expect(result3.cz).toBe(-1);
    expect(result3.lx).toBe(11); // (-5 % 16 + 16) % 16 = 11
    expect(result3.ly).toBe(6); // (-10 % 16 + 16) % 16 = 6
    expect(result3.lz).toBe(1); // (-15 % 16 + 16) % 16 = 1
  });

  it("provides pre-computed geometry data", () => {
    const vertices = getBVXVertices();
    expect(vertices).toBeInstanceOf(Float32Array);
    expect(vertices.length).toBeGreaterThan(0);

    const normals = getBVXNormals();
    expect(normals).toBeInstanceOf(Float32Array);
    expect(normals.length).toBeGreaterThan(0);

    const uv = getBVXUV();
    expect(uv).toBeInstanceOf(Float32Array);
    expect(uv.length).toBeGreaterThan(0);
  });

  it("creates a demo world", () => {
    const world = createDemoWorld();
    expect(world).toBeDefined();

    // Should have at least one chunk
    const chunk = world.get(createChunk(0, 0, 0).key);
    expect(chunk).toBeDefined();
    expect(chunk!.length).toBeGreaterThan(0); // Should have some voxels set
  });

  it("maintains voxel consistency across operations", () => {
    const chunk = createChunk(0, 0, 0);

    // Set multiple bitvoxels (0-15 range for bitvoxel coordinates in a chunk)
    for (let i = 0; i < 10; i++) {
      setVoxelInChunk(chunk, i, 0, 0, true);
    }

    // Verify they're all set
    for (let i = 0; i < 10; i++) {
      expect(getVoxelInChunk(chunk, i, 0, 0)).toBe(true);
    }

    // Clear some
    for (let i = 0; i < 5; i++) {
      setVoxelInChunk(chunk, i, 0, 0, false);
    }

    // Verify the state
    for (let i = 0; i < 5; i++) {
      expect(getVoxelInChunk(chunk, i, 0, 0)).toBe(false);
    }
    for (let i = 5; i < 10; i++) {
      expect(getVoxelInChunk(chunk, i, 0, 0)).toBe(true);
    }
  });
});
