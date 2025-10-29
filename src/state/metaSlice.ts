import { StateCreator } from "zustand";

export interface SwarmCognitionUpgrades {
  congestionAvoidanceLevel: number;
  prefetchUnlocked: boolean;
  startingSpecialists: {
    hauler: number;
    builder: number;
    maintainer: number;
  };
  multiDropUnlocked: boolean;
}

export interface BioStructureUpgrades {
  startingRadius: number;
  startingExtractorTier: number;
  passiveCoolingBonus: number;
  startingCoreInventory: {
    Components?: number;
    TissueMass?: number;
  };
}

export interface CompilerOptimizationUpgrades {
  compileYieldMult: number;
  overclockEfficiencyBonus: number;
  recycleBonus: number;
  startingForkPoints: number;
}

export interface MetaSlice {
  compileShardsBanked: number;
  totalPrestiges: number;

  swarmCognition: SwarmCognitionUpgrades;
  bioStructure: BioStructureUpgrades;
  compilerOptimization: CompilerOptimizationUpgrades;

  spendShards: (tree: "swarm" | "bio" | "compiler", upgradeId: string) => void;
}

export const createMetaSlice: StateCreator<MetaSlice, [], [], MetaSlice> = () => ({
  compileShardsBanked: 0,
  totalPrestiges: 0,

  swarmCognition: {
    congestionAvoidanceLevel: 0,
    prefetchUnlocked: false,
    startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
    multiDropUnlocked: false,
  },

  bioStructure: {
    startingRadius: 4,
    startingExtractorTier: 1,
    passiveCoolingBonus: 0,
    startingCoreInventory: {},
  },

  compilerOptimization: {
    compileYieldMult: 1.0,
    overclockEfficiencyBonus: 0,
    recycleBonus: 0,
    startingForkPoints: 0,
  },

  spendShards: (tree, upgradeId) => {
    // TODO: Implement upgrade purchase logic
    console.log(`Spending shards on ${tree}: ${upgradeId}`);
  },
});
