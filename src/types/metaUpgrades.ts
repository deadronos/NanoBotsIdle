export type UpgradeTreeType = "swarmCognition" | "bioStructure" | "compilerOptimization";

export interface UpgradeCost {
  currency: "CompileShards";
  amount: number;
}

export interface UpgradeRequirements {
  minPrestiges: number;
  requiresUpgradeIds: string[];
}

export interface UpgradeEffects {
  swarm?: {
    congestionAvoidanceLevel?: number;
    prefetchUnlocked?: boolean;
    startingSpecialists?: {
      hauler?: number;
      builder?: number;
      maintainer?: number;
    };
    multiDropUnlocked?: boolean;
  };
  bio?: {
    startingRadius?: number;
    passiveCoolingBonus?: number;
    startingExtractorTier?: number;
    startingCoreInventory?: {
      Components?: number;
      TissueMass?: number;
    };
  };
  compiler?: {
    compileYieldMult?: number;
    overclockEfficiencyBonus?: number;
    recycleBonus?: number;
    startingForkPoints?: number;
  };
}

export interface MetaUpgrade {
  id: string;
  name: string;
  desc: string;
  cost: UpgradeCost;
  requires: UpgradeRequirements;
  effects: UpgradeEffects;
}

export interface MetaUpgradesData {
  swarmCognition: MetaUpgrade[];
  bioStructure: MetaUpgrade[];
  compilerOptimization: MetaUpgrade[];
}
