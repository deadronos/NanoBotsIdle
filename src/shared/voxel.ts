import { LinearKey, WorldIndex } from "@astrumforge/bvx-kit";

export const MATERIAL_AIR = 0 as const;
export const MATERIAL_SOLID = 1 as const;
export const MATERIAL_BEDROCK = 2 as const;

export type VoxelMaterial = typeof MATERIAL_AIR | typeof MATERIAL_SOLID | typeof MATERIAL_BEDROCK;
export type VoxelKey = number;

const VOXEL_COORD_OFFSET = 512;

const linearKeyScratch = new LinearKey();

const toBvxCoord = (value: number) => value + VOXEL_COORD_OFFSET;
const fromBvxCoord = (value: number) => value - VOXEL_COORD_OFFSET;

export const voxelKey = (x: number, y: number, z: number): VoxelKey => {
  LinearKey.from(toBvxCoord(x), toBvxCoord(y), toBvxCoord(z), linearKeyScratch);
  return linearKeyScratch.key;
};

export const coordsFromVoxelKey = (key: VoxelKey) => {
  const decoded = new LinearKey(key);
  return {
    x: fromBvxCoord(decoded.x),
    y: fromBvxCoord(decoded.y),
    z: fromBvxCoord(decoded.z),
  };
};

export const toWorldIndex = (x: number, y: number, z: number, optres?: WorldIndex) => {
  return WorldIndex.from(toBvxCoord(x), toBvxCoord(y), toBvxCoord(z), optres ?? new WorldIndex());
};
