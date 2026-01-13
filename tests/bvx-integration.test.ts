import { describe, expect, it } from "vitest";
import { BVXWorldAdapter, MATERIAL_AIR, MATERIAL_SOLID } from "../src/shared/bvxAdapter";
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

  it("correctly maps world coordinates beyond 3 to proper voxel indices", () => {
    const adapter = new BVXWorldAdapter();

    // Test coordinates that would have been broken with the old implementation
    // These are coordinates within the first chunk (0-15 range)
    
    // Set voxels at various positions
    adapter.setVoxel(0, 0, 0, MATERIAL_SOLID);
    adapter.setVoxel(3, 0, 0, MATERIAL_SOLID);
    adapter.setVoxel(4, 0, 0, MATERIAL_SOLID); // Would have mapped to (0,0,0) before fix
    adapter.setVoxel(7, 0, 0, MATERIAL_SOLID); // Would have mapped to (0,0,0) before fix
    adapter.setVoxel(8, 0, 0, MATERIAL_SOLID); // Would have mapped to (0,0,0) before fix
    adapter.setVoxel(15, 0, 0, MATERIAL_SOLID); // Would have mapped to (0,0,0) before fix

    // Verify they are all set correctly and independently
    expect(adapter.getVoxel(0, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(3, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(4, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(7, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(8, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(15, 0, 0)).toBe(MATERIAL_SOLID);

    // Verify they don't interfere with each other
    adapter.setVoxel(4, 0, 0, MATERIAL_AIR);
    expect(adapter.getVoxel(4, 0, 0)).toBe(MATERIAL_AIR);
    expect(adapter.getVoxel(0, 0, 0)).toBe(MATERIAL_SOLID); // Should still be solid
    expect(adapter.getVoxel(8, 0, 0)).toBe(MATERIAL_SOLID); // Should still be solid
  });

  it("correctly handles coordinates in different chunks", () => {
    const adapter = new BVXWorldAdapter();

    // Set voxels in different chunks
    adapter.setVoxel(0, 0, 0, MATERIAL_SOLID); // Chunk (0,0,0)
    adapter.setVoxel(16, 0, 0, MATERIAL_SOLID); // Chunk (1,0,0)
    adapter.setVoxel(32, 0, 0, MATERIAL_SOLID); // Chunk (2,0,0)
    adapter.setVoxel(0, 16, 0, MATERIAL_SOLID); // Chunk (0,1,0)
    adapter.setVoxel(0, 0, 16, MATERIAL_SOLID); // Chunk (0,0,1)

    // Verify all are set correctly
    expect(adapter.getVoxel(0, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(16, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(32, 0, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(0, 16, 0)).toBe(MATERIAL_SOLID);
    expect(adapter.getVoxel(0, 0, 16)).toBe(MATERIAL_SOLID);

    // Verify they are independent
    adapter.setVoxel(0, 0, 0, MATERIAL_AIR);
    expect(adapter.getVoxel(0, 0, 0)).toBe(MATERIAL_AIR);
    expect(adapter.getVoxel(16, 0, 0)).toBe(MATERIAL_SOLID);
  });
});
