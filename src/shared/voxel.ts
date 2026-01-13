// Re-export from bvxAdapter for backward compatibility
export type { VoxelMaterial } from "./bvxAdapter";
export { MATERIAL_AIR, MATERIAL_BEDROCK, MATERIAL_SOLID } from "./bvxAdapter";

// Re-export utility functions from bvxAdapter
import { BVXWorldAdapter } from "./bvxAdapter";

export const voxelKey = BVXWorldAdapter.voxelKey;
export const coordsFromVoxelKey = BVXWorldAdapter.coordsFromVoxelKey;
