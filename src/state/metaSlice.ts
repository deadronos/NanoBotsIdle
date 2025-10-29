import { StateCreator } from "zustand";
import metaUpgradesData from "../data/metaUpgrades.json";
import { MetaUpgrade, MetaUpgradesData } from "../types/metaUpgrades";

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
  purchasedUpgrades: string[];

  swarmCognition: SwarmCognitionUpgrades;
  bioStructure: BioStructureUpgrades;
  compilerOptimization: CompilerOptimizationUpgrades;

  getAvailableUpgrades: (tree: "swarmCognition" | "bioStructure" | "compilerOptimization") => MetaUpgrade[];
  canPurchaseUpgrade: (upgradeId: string) => { canPurchase: boolean; reason?: string };
  purchaseUpgrade: (upgradeId: string) => boolean;
  spendShards: (tree: "swarm" | "bio" | "compiler", upgradeId: string) => void;
}

const upgradesData = metaUpgradesData as MetaUpgradesData;

function applyUpgradeEffects(
  state: MetaSlice,
  upgrade: MetaUpgrade
): Partial<MetaSlice> {
  const updates: Partial<MetaSlice> = {};

  if (upgrade.effects.swarm) {
    const swarm = { ...state.swarmCognition };
    if (upgrade.effects.swarm.congestionAvoidanceLevel !== undefined) {
      swarm.congestionAvoidanceLevel = upgrade.effects.swarm.congestionAvoidanceLevel;
    }
    if (upgrade.effects.swarm.prefetchUnlocked !== undefined) {
      swarm.prefetchUnlocked = upgrade.effects.swarm.prefetchUnlocked;
    }
    if (upgrade.effects.swarm.startingSpecialists) {
      swarm.startingSpecialists = {
        hauler: swarm.startingSpecialists.hauler + (upgrade.effects.swarm.startingSpecialists.hauler || 0),
        builder: swarm.startingSpecialists.builder + (upgrade.effects.swarm.startingSpecialists.builder || 0),
        maintainer: swarm.startingSpecialists.maintainer + (upgrade.effects.swarm.startingSpecialists.maintainer || 0),
      };
    }
    if (upgrade.effects.swarm.multiDropUnlocked !== undefined) {
      swarm.multiDropUnlocked = upgrade.effects.swarm.multiDropUnlocked;
    }
    updates.swarmCognition = swarm;
  }

  if (upgrade.effects.bio) {
    const bio = { ...state.bioStructure };
    if (upgrade.effects.bio.startingRadius !== undefined) {
      bio.startingRadius = Math.max(bio.startingRadius, upgrade.effects.bio.startingRadius);
    }
    if (upgrade.effects.bio.passiveCoolingBonus !== undefined) {
      bio.passiveCoolingBonus += upgrade.effects.bio.passiveCoolingBonus;
    }
    if (upgrade.effects.bio.startingExtractorTier !== undefined) {
      bio.startingExtractorTier = Math.max(bio.startingExtractorTier, upgrade.effects.bio.startingExtractorTier);
    }
    if (upgrade.effects.bio.startingCoreInventory) {
      bio.startingCoreInventory = {
        ...bio.startingCoreInventory,
        ...upgrade.effects.bio.startingCoreInventory,
      };
    }
    updates.bioStructure = bio;
  }

  if (upgrade.effects.compiler) {
    const compiler = { ...state.compilerOptimization };
    if (upgrade.effects.compiler.compileYieldMult !== undefined) {
      compiler.compileYieldMult = upgrade.effects.compiler.compileYieldMult;
    }
    if (upgrade.effects.compiler.overclockEfficiencyBonus !== undefined) {
      compiler.overclockEfficiencyBonus += upgrade.effects.compiler.overclockEfficiencyBonus;
    }
    if (upgrade.effects.compiler.recycleBonus !== undefined) {
      compiler.recycleBonus = upgrade.effects.compiler.recycleBonus;
    }
    if (upgrade.effects.compiler.startingForkPoints !== undefined) {
      compiler.startingForkPoints = upgrade.effects.compiler.startingForkPoints;
    }
    updates.compilerOptimization = compiler;
  }

  return updates;
}

export const createMetaSlice: StateCreator<MetaSlice, [], [], MetaSlice> = (set, get) => ({
  compileShardsBanked: 0,
  totalPrestiges: 0,
  purchasedUpgrades: [],

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

  getAvailableUpgrades: (tree) => {
    return upgradesData[tree] || [];
  },

  canPurchaseUpgrade: (upgradeId) => {
    const state = get();
    
    // Find the upgrade
    let upgrade: MetaUpgrade | undefined;
    for (const tree of Object.values(upgradesData)) {
      upgrade = tree.find((u: MetaUpgrade) => u.id === upgradeId);
      if (upgrade) break;
    }

    if (!upgrade) {
      return { canPurchase: false, reason: "Upgrade not found" };
    }

    // Check if already purchased
    if (state.purchasedUpgrades.includes(upgradeId)) {
      return { canPurchase: false, reason: "Already purchased" };
    }

    // Check prestige requirements
    if (state.totalPrestiges < upgrade.requires.minPrestiges) {
      return { 
        canPurchase: false, 
        reason: `Requires ${upgrade.requires.minPrestiges} prestige${upgrade.requires.minPrestiges !== 1 ? 's' : ''}` 
      };
    }

    // Check prerequisite upgrades
    for (const reqId of upgrade.requires.requiresUpgradeIds) {
      if (!state.purchasedUpgrades.includes(reqId)) {
        const reqUpgrade = Object.values(upgradesData)
          .flat()
          .find((u) => u.id === reqId);
        return { 
          canPurchase: false, 
          reason: `Requires: ${reqUpgrade?.name || reqId}` 
        };
      }
    }

    // Check cost
    if (state.compileShardsBanked < upgrade.cost.amount) {
      return { 
        canPurchase: false, 
        reason: `Need ${upgrade.cost.amount} shards (have ${Math.floor(state.compileShardsBanked)})` 
      };
    }

    return { canPurchase: true };
  },

  purchaseUpgrade: (upgradeId) => {
    const state = get();
    const checkResult = state.canPurchaseUpgrade(upgradeId);
    
    if (!checkResult.canPurchase) {
      console.warn(`Cannot purchase upgrade ${upgradeId}: ${checkResult.reason}`);
      return false;
    }

    // Find the upgrade
    let upgrade: MetaUpgrade | undefined;
    for (const tree of Object.values(upgradesData)) {
      upgrade = tree.find((u: MetaUpgrade) => u.id === upgradeId);
      if (upgrade) break;
    }

    if (!upgrade) return false;

    // Apply the upgrade
    const effects = applyUpgradeEffects(state, upgrade);
    
    set({
      compileShardsBanked: state.compileShardsBanked - upgrade.cost.amount,
      purchasedUpgrades: [...state.purchasedUpgrades, upgradeId],
      ...effects,
    });

    return true;
  },

  spendShards: (_tree, upgradeId) => {
    get().purchaseUpgrade(upgradeId);
  },
});
