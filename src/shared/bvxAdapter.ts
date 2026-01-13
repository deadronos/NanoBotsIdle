/**
 * Adapter layer for integrating bvx-kit library with NanoBotsIdle voxel logic.
 * Provides a bridge between the game's existing voxel system and bvx-kit's
 * BitVoxel architecture.
 */

import {
  BVXGeometry,
  BVXLayer,
  MortonKey,
  VoxelChunk0,
  VoxelIndex,
  VoxelWorld,
  WorldIndex,
} from "@astrumforge/bvx-kit";

// Re-export material constants for compatibility
export const MATERIAL_AIR = 0 as const;
export const MATERIAL_SOLID = 1 as const;
export const MATERIAL_BEDROCK = 2 as const;

export type VoxelMaterial = typeof MATERIAL_AIR | typeof MATERIAL_SOLID | typeof MATERIAL_BEDROCK;

/**
 * Adapter for bvx-kit's VoxelWorld.
 * Maps NanoBotsIdle's voxel coordinate system to bvx-kit's chunk-based system.
 */
export class BVXWorldAdapter {
  private readonly world: VoxelWorld;
  // Chunk size: each VoxelChunk is 4x4x4 voxels, each voxel is 4x4x4 bitvoxels = 16x16x16 bitvoxels total
  private readonly chunkVoxelSize = 4; // VoxelChunk.DIMS
  private readonly bitvoxelSize = 4; // Each voxel contains 4x4x4 bitvoxels
  private readonly chunkBitvoxelSize = 16; // BVXLayer.DIMS

  constructor() {
    this.world = new VoxelWorld();
  }

  /**
   * Convert world coordinates to chunk coordinates.
   */
  private worldToChunkCoords(x: number, y: number, z: number): { cx: number; cy: number; cz: number } {
    return {
      cx: Math.floor(x / this.chunkBitvoxelSize),
      cy: Math.floor(y / this.chunkBitvoxelSize),
      cz: Math.floor(z / this.chunkBitvoxelSize),
    };
  }

  /**
   * Convert world coordinates to local bitvoxel coordinates within a chunk.
   */
  private worldToLocalCoords(x: number, y: number, z: number): { lx: number; ly: number; lz: number } {
    return {
      lx: ((x % this.chunkBitvoxelSize) + this.chunkBitvoxelSize) % this.chunkBitvoxelSize,
      ly: ((y % this.chunkBitvoxelSize) + this.chunkBitvoxelSize) % this.chunkBitvoxelSize,
      lz: ((z % this.chunkBitvoxelSize) + this.chunkBitvoxelSize) % this.chunkBitvoxelSize,
    };
  }

  /**
   * Get or create a chunk at the given chunk coordinates.
   */
  private getOrCreateChunk(cx: number, cy: number, cz: number): VoxelChunk0 {
    const key = MortonKey.from(cx, cy, cz);
    let chunk = this.world.get(key) as VoxelChunk0 | null;
    if (!chunk) {
      chunk = new VoxelChunk0(key);
      this.world.insert(chunk);
    }
    return chunk;
  }

  /**
   * Set voxel at world coordinates.
   * @param x World X coordinate
   * @param y World Y coordinate
   * @param z World Z coordinate
   * @param material Material type (AIR or SOLID)
   */
  setVoxel(x: number, y: number, z: number, material: VoxelMaterial): void {
    const { cx, cy, cz } = this.worldToChunkCoords(x, y, z);
    const { lx, ly, lz } = this.worldToLocalCoords(x, y, z);

    const chunk = this.getOrCreateChunk(cx, cy, cz);
    const index = VoxelIndex.from(lx, ly, lz);

    if (material === MATERIAL_AIR) {
      chunk.layer.unset(index);
    } else {
      chunk.layer.set(index);
    }
  }

  /**
   * Get voxel material at world coordinates.
   * @param x World X coordinate
   * @param y World Y coordinate
   * @param z World Z coordinate
   * @returns Material type (AIR or SOLID)
   */
  getVoxel(x: number, y: number, z: number): VoxelMaterial {
    const { cx, cy, cz } = this.worldToChunkCoords(x, y, z);
    const { lx, ly, lz } = this.worldToLocalCoords(x, y, z);

    const key = MortonKey.from(cx, cy, cz);
    const chunk = this.world.get(key) as VoxelChunk0 | null;

    if (!chunk) {
      return MATERIAL_AIR;
    }

    const index = VoxelIndex.from(lx, ly, lz);
    return chunk.layer.get(index) ? MATERIAL_SOLID : MATERIAL_AIR;
  }

  /**
   * Check if a voxel exists at world coordinates.
   */
  hasVoxel(x: number, y: number, z: number): boolean {
    return this.getVoxel(x, y, z) !== MATERIAL_AIR;
  }

  /**
   * Fill a voxel (all bitvoxels within it).
   */
  fillVoxel(x: number, y: number, z: number): void {
    const { cx, cy, cz } = this.worldToChunkCoords(x, y, z);
    const { lx, ly, lz } = this.worldToLocalCoords(x, y, z);

    const chunk = this.getOrCreateChunk(cx, cy, cz);
    const index = VoxelIndex.from(lx, ly, lz);
    chunk.layer.fill(index);
  }

  /**
   * Empty a voxel (all bitvoxels within it).
   */
  emptyVoxel(x: number, y: number, z: number): void {
    const { cx, cy, cz } = this.worldToChunkCoords(x, y, z);
    const { lx, ly, lz } = this.worldToLocalCoords(x, y, z);

    const chunk = this.getOrCreateChunk(cx, cy, cz);
    const index = VoxelIndex.from(lx, ly, lz);
    chunk.layer.empty(index);
  }

  /**
   * Get the underlying VoxelWorld instance.
   */
  getWorld(): VoxelWorld {
    return this.world;
  }

  /**
   * Get a chunk at chunk coordinates.
   */
  getChunk(cx: number, cy: number, cz: number): VoxelChunk0 | null {
    const key = MortonKey.from(cx, cy, cz);
    return this.world.get(key) as VoxelChunk0 | null;
  }

  /**
   * Create a voxel key string for compatibility with existing code.
   */
  static voxelKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /**
   * Parse coordinates from voxel key string for compatibility with existing code.
   */
  static coordsFromVoxelKey(key: string): { x: number; y: number; z: number } {
    const [x, y, z] = key.split(",").map((value) => Number(value));
    return { x, y, z };
  }
}

/**
 * Utility to generate geometry from a chunk using BVXGeometry.
 */
export function generateChunkGeometry(chunk: VoxelChunk0): {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
} {
  // Get the pre-computed vertices and normals from BVXGeometry
  const positions = BVXGeometry.vertices;
  const normals = BVXGeometry.normals;

  // TODO: Implement proper geometry generation using VoxelFaceGeometry
  // For now, return empty geometry as a placeholder
  const indices = new Uint32Array(0);

  return {
    positions,
    normals,
    indices,
  };
}
