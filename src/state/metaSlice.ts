import type { StateCreator } from "zustand";

import type {
  CompilerOptimizationUpgrades,
  GameState,
  MetaSlice,
  SwarmCognitionUpgrades,
} from "./types";
import { warnUnimplemented } from "./utils";

const defaultSwarmCognition = (): SwarmCognitionUpgrades => ({
  congestionAvoidanceLevel: 0,
  prefetchUnlocked: false,
  startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
});

const defaultCompilerOptimization = (): CompilerOptimizationUpgrades => ({
  compileYieldMult: 1,
  overclockEfficiencyBonus: 0,
  recycleBonus: 0,
});

export const createMetaSlice: StateCreator<GameState, [], [], MetaSlice> = (
  set,
  get,
  _api,
) => ({
  compileShardsBanked: 0,
  totalPrestiges: 0,
  swarmCognition: defaultSwarmCognition(),
  bioStructure: {
    startingRadius: 4,
    startingExtractorTier: 1,
    passiveCoolingBonus: 0,
  },
  compilerOptimization: defaultCompilerOptimization(),
  spendShards: (tree, upgradeId) => {
    const state = get();
    warnUnimplemented("spendShards not yet implemented", tree, upgradeId, state);
  },
});
