import type { Config } from "../../config/index";
import type { VoxelKey } from "../../shared/voxel";
import { getSeed } from "../../sim/seed";
import { WorldModel } from "./world";

export type WorldInitResult = {
  world: WorldModel;
  actualSeed: number;
  frontierKeys: VoxelKey[];
  frontierPositions: Float32Array;
  aboveWaterCount: number;
};

export const initWorldForPrestige = (prestigeLevel: number, cfg: Config): WorldInitResult => {
  const baseSeed = getSeed(prestigeLevel);
  const retryLimit = cfg.terrain.genRetries ?? 5;
  const minBlocks = cfg.economy.prestigeMinMinedBlocks;

  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    const candidateSeed = baseSeed + attempt * 101;
    const candidateWorld = new WorldModel({ seed: candidateSeed });
    const aboveWater = candidateWorld.initializeFrontierFromSurface(cfg.terrain.worldRadius);
    if (aboveWater >= minBlocks) {
      return {
        world: candidateWorld,
        actualSeed: candidateSeed,
        frontierKeys: candidateWorld.getFrontierKeys(),
        frontierPositions: candidateWorld.getFrontierPositionsArray(),
        aboveWaterCount: aboveWater,
      };
    }
  }

  const world = new WorldModel({ seed: baseSeed });
  const aboveWater = world.initializeFrontierFromSurface(cfg.terrain.worldRadius);
  return {
    world,
    actualSeed: baseSeed,
    frontierKeys: world.getFrontierKeys(),
    frontierPositions: world.getFrontierPositionsArray(),
    aboveWaterCount: aboveWater,
  };
};
