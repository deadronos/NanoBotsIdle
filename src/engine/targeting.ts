import type { VoxelKey } from "../shared/voxel";
import type { WorldModel } from "./world/world";

export const pickTargetKey = (options: {
  world: WorldModel | null;
  frontierKeys: VoxelKey[];
  minedKeys: Set<VoxelKey>;
  reservedKeys: Set<VoxelKey>;
  waterLevel: number;
  maxAttempts: number;
}) => {
  const { world, frontierKeys, minedKeys, reservedKeys, waterLevel, maxAttempts } = options;

  if (!world) return null;
  if (frontierKeys.length === 0) return null;

  const waterline = Math.floor(waterLevel);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const idx = Math.floor(Math.random() * frontierKeys.length);
    const key = frontierKeys[idx];
    const { y } = world.coordsFromKey(key);
    if (y < waterline) {
      attempts += 1;
      continue;
    }
    if (!minedKeys.has(key) && !reservedKeys.has(key)) {
      reservedKeys.add(key);
      return key;
    }
    attempts += 1;
  }

  return null;
};
