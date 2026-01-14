import { VoxelChunk0, VoxelWorld, type WorldIndex } from "@astrumforge/bvx-kit";

import { MATERIAL_AIR, toWorldIndex } from "./voxel";

export class VoxelEditStore {
  private world: VoxelWorld;
  private readonly scratchIndex: WorldIndex;

  constructor() {
    this.world = new VoxelWorld();
    this.scratchIndex = toWorldIndex(0, 0, 0);
  }

  clear() {
    this.world = new VoxelWorld();
  }

  hasAirEdit(x: number, y: number, z: number) {
    const index = toWorldIndex(x, y, z, this.scratchIndex);
    const chunk = this.world.get(index.chunkIndex);
    if (!chunk) return false;
    return chunk.getBitVoxel(index.voxelIndex) === 1;
  }

  setMaterial(x: number, y: number, z: number, material: number) {
    const index = toWorldIndex(x, y, z, this.scratchIndex);
    const chunk = this.world.get(index.chunkIndex);

    if (material === MATERIAL_AIR) {
      if (chunk) {
        chunk.setBitVoxel(index.voxelIndex);
        return;
      }
      const created = new VoxelChunk0(index.chunkIndex.clone());
      created.setBitVoxel(index.voxelIndex);
      this.world.insert(created);
      return;
    }

    if (chunk) {
      chunk.unsetBitVoxel(index.voxelIndex);
    }
  }
}
