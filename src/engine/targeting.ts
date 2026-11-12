import type { LandingProfile } from "../shared/miningOperations";
import type { VoxelKey } from "../shared/voxel";
import type { WorldModel } from "./world/world";

export const pickTargetKey = (options: {
  world: WorldModel | null;
  frontierKeys: VoxelKey[];
  minedKeys: Set<VoxelKey>;
  reservedKeys: Set<VoxelKey>;
  waterLevel: number;
  maxAttempts: number;
  exhaustSearch?: boolean;
  landing?: LandingProfile;
}) => {
  const { world, frontierKeys, minedKeys, reservedKeys, waterLevel, maxAttempts } = options;

  if (!world) return null;
  if (frontierKeys.length === 0) return null;

  const waterline = Math.floor(waterLevel);
  const start = options.exhaustSearch ? Math.floor(Math.random() * frontierKeys.length) : 0;
  const limit = options.exhaustSearch ? frontierKeys.length : maxAttempts;
  const home = options.landing ? world.getOutposts()[0] : undefined;
  let bestKey: VoxelKey | null = null;
  let bestScore = Infinity;
  let attempts = 0;

  while (attempts < limit) {
    const idx =
      options.exhaustSearch ?
        (start + attempts) % frontierKeys.length
      : Math.floor(Math.random() * frontierKeys.length);
    const key = frontierKeys[idx];
    const { x, y, z } = world.coordsFromKey(key);
    if (y < waterline || world.isStarterFoundation(x, z)) {
      attempts += 1;
      continue;
    }
    if (!minedKeys.has(key) && !reservedKeys.has(key)) {
      if (!home) {
        reservedKeys.add(key);
        return key;
      }
      const distance = (home.x - x) ** 2 + (home.z - z) ** 2;
      const score = options.landing === "rich" ? -distance : distance;
      if (score < bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
    attempts += 1;
  }

  if (bestKey !== null) reservedKeys.add(bestKey);
  return bestKey;
};
