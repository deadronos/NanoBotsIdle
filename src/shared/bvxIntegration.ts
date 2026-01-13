/**
 * Integration helpers for using bvx-kit alongside the existing voxel system.
 * These utilities demonstrate how bvx-kit can be used for efficient voxel operations.
 */

import {
  BVXGeometry,
  MortonKey,
  VoxelChunk0,
  VoxelIndex,
  VoxelWorld,
} from "@astrumforge/bvx-kit";

/**
 * Create a VoxelWorld instance for managing chunks.
 * This can be used as an alternative storage backend to Map-based storage.
 */
export function createBVXWorld(): VoxelWorld {
  return new VoxelWorld();
}

/**
 * Create a chunk at the given coordinates.
 */
export function createChunk(cx: number, cy: number, cz: number): VoxelChunk0 {
  const key = MortonKey.from(cx, cy, cz);
  return new VoxelChunk0(key);
}

/**
 * Set a bitvoxel in a chunk using local bitvoxel coordinates (0-15 for each axis).
 * This converts the 0-15 range to voxel (0-3) and bitvoxel (0-3) coordinates.
 */
export function setVoxelInChunk(chunk: VoxelChunk0, lx: number, ly: number, lz: number, solid: boolean): void {
  // Convert 0-15 bitvoxel coords to voxel (0-3) + bitvoxel (0-3) coords
  const vx = Math.floor(lx / 4);
  const vy = Math.floor(ly / 4);
  const vz = Math.floor(lz / 4);
  const bx = lx % 4;
  const by = ly % 4;
  const bz = lz % 4;

  const index = VoxelIndex.from(vx, vy, vz, bx, by, bz);
  if (solid) {
    chunk.layer.set(index);
  } else {
    chunk.layer.unset(index);
  }
}

/**
 * Get a bitvoxel state from a chunk using local bitvoxel coordinates (0-15).
 */
export function getVoxelInChunk(chunk: VoxelChunk0, lx: number, ly: number, lz: number): boolean {
  const vx = Math.floor(lx / 4);
  const vy = Math.floor(ly / 4);
  const vz = Math.floor(lz / 4);
  const bx = lx % 4;
  const by = ly % 4;
  const bz = lz % 4;

  const index = VoxelIndex.from(vx, vy, vz, bx, by, bz);
  return chunk.layer.get(index) !== 0;
}

/**
 * Fill an entire voxel (4x4x4 bitvoxels) within a chunk.
 */
export function fillVoxelInChunk(chunk: VoxelChunk0, vx: number, vy: number, vz: number): void {
  const index = VoxelIndex.from(vx, vy, vz);
  chunk.layer.fill(index);
}

/**
 * Empty an entire voxel (4x4x4 bitvoxels) within a chunk.
 */
export function emptyVoxelInChunk(chunk: VoxelChunk0, vx: number, vy: number, vz: number): void {
  const index = VoxelIndex.from(vx, vy, vz);
  chunk.layer.empty(index);
}

/**
 * Get the pre-computed vertices for BitVoxel rendering.
 * These vertices are optimized for 16x16x16 BitVoxel chunks.
 */
export function getBVXVertices(): Float32Array {
  return BVXGeometry.vertices;
}

/**
 * Get the pre-computed normals for BitVoxel rendering.
 */
export function getBVXNormals(): Float32Array {
  return BVXGeometry.normals;
}

/**
 * Get the UV coordinates for BitVoxel rendering.
 */
export function getBVXUV(): Float32Array {
  return BVXGeometry.uv;
}

/**
 * Get the number of active (set) bitvoxels in a chunk.
 */
export function getChunkPopulation(chunk: VoxelChunk0): number {
  return chunk.length;
}

/**
 * Example: Convert world coordinates to chunk and local coordinates.
 * This demonstrates the coordinate system mapping between world space and bvx-kit's chunk space.
 */
export function worldToChunkLocal(
  wx: number,
  wy: number,
  wz: number,
  chunkBitvoxelSize = 16,
): {
  cx: number;
  cy: number;
  cz: number;
  lx: number;
  ly: number;
  lz: number;
} {
  return {
    cx: Math.floor(wx / chunkBitvoxelSize),
    cy: Math.floor(wy / chunkBitvoxelSize),
    cz: Math.floor(wz / chunkBitvoxelSize),
    lx: ((wx % chunkBitvoxelSize) + chunkBitvoxelSize) % chunkBitvoxelSize,
    ly: ((wy % chunkBitvoxelSize) + chunkBitvoxelSize) % chunkBitvoxelSize,
    lz: ((wz % chunkBitvoxelSize) + chunkBitvoxelSize) % chunkBitvoxelSize,
  };
}

/**
 * Example: Create a simple demo world with some voxels set.
 */
export function createDemoWorld(): VoxelWorld {
  const world = createBVXWorld();

  // Create a chunk at origin
  const chunk = createChunk(0, 0, 0);

  // Fill some voxels to create a simple structure
  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      fillVoxelInChunk(chunk, x, 0, z); // Ground layer
    }
  }

  // Add a simple tower
  for (let y = 1; y < 4; y++) {
    fillVoxelInChunk(chunk, 1, y, 1);
  }

  world.insert(chunk);
  return world;
}
