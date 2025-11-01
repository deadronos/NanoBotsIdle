import type { StateCreator } from "zustand";

import type {
  CompilerOptimizationUpgrades,
  GameState,
  MetaSlice,
  SwarmCognitionUpgrades,
} from "./types";
// unused util removed

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

import { getUpgradeCost } from "../sim/buildCosts";

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
  spendShards: (_tree, upgradeId) => {
    const state = get();
    const cost = getUpgradeCost(upgradeId).shards ?? 0;
    if (!Number.isFinite(cost) || cost <= 0) {
      return true;
    }
    if (state.compileShardsBanked >= cost) {
      set({ compileShardsBanked: Math.max(0, state.compileShardsBanked - cost) });
      return true;
    }
    return false;
  },
});
