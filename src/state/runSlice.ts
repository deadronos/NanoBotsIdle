import { StateCreator } from "zustand";
import { World } from "../ecs/world/World";
import { createWorld } from "../ecs/world/createWorld";
import { MetaSlice } from "./metaSlice";
import { getCompileShardEstimate } from "../sim/balance";
import { BuildingType } from "../types/buildings";
import { placeBuilding } from "./buildingActions";

export interface UISnapshot {
  heatCurrent: number;
  heatSafeCap: number;
  heatRatio: number;
  powerAvailable: number;
  powerDemand: number;
  throughput: number;
  projectedShards: number;
  currentPhase: 1 | 2 | 3;
  simTimeSeconds: number;
  overclockEnabled: boolean;
  canFork: boolean;
  canPrestige: boolean;
  canSelfTerminate: boolean;
  drones: Array<{
    id: number;
    x: number;
    y: number;
    role: string;
    cargoAmount: number;
    state: string;
  }>;
  buildings: Array<{
    id: number;
    x: number;
    y: number;
    type: string;
    tier?: number;
    online?: boolean;
  }>;
}

export interface RunSlice {
  world: World;
  projectedCompileShards: number;
  forkPoints: number;
  selectedEntity: number | null;
  selectedBuildingType: BuildingType | null;
  currentPhase: 1 | 2 | 3;
  overclockArmed: boolean;
  scrapBonusShards: number;
  uiSnapshot: UISnapshot | null;

  // Actions
  setSelectedEntity: (id: number | null) => void;
  setSelectedBuildingType: (type: BuildingType | null) => void;
  placeBuilding: (x: number, y: number) => boolean;
  toggleOverclock: (on: boolean) => void;
  scrapEntity: (entityId: number) => number;
  selfTerminate: () => void;
  forkProcess: () => void;
  prestigeNow: () => void;
  updateUISnapshot: () => void;
}

export const createRunSlice: StateCreator<RunSlice & MetaSlice, [], [], RunSlice> = (set, get) => ({
  world: createWorld({
    swarm: {
      congestionAvoidanceLevel: 0,
      prefetchUnlocked: false,
      startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
      multiDropUnlocked: false,
    },
    bio: {
      startingRadius: 4,
      startingExtractorTier: 1,
      passiveCoolingBonus: 0,
      startingCoreInventory: {},
    },
    compiler: {
      compileYieldMult: 1.0,
      overclockEfficiencyBonus: 0,
      recycleBonus: 0,
      startingForkPoints: 0,
    },
  }),
  projectedCompileShards: 0,
  forkPoints: 0,
  selectedEntity: null,
  selectedBuildingType: null,
  currentPhase: 1,
  overclockArmed: false,
  scrapBonusShards: 0,
  uiSnapshot: null,

  setSelectedEntity: (id: number | null) => {
    set({ selectedEntity: id });
  },

  setSelectedBuildingType: (type: BuildingType | null) => {
    set({ selectedBuildingType: type });
  },

  placeBuilding: (x: number, y: number) => {
    const state = get();
    if (!state.selectedBuildingType) return false;

    const success = placeBuilding(state.world, state.selectedBuildingType, x, y);
    if (success) {
      set({ selectedBuildingType: null });
    }
    return success;
  },

  toggleOverclock: (on: boolean) => {
    const world = get().world;
    world.globals.overclockEnabled = on;
    set({ overclockArmed: on });
  },

  scrapEntity: (entityId: number) => {
    const state = get();
    const world = state.world;
    const entityType = world.entityType[entityId];

    if (!entityType || entityType === "Core") {
      return 0; // Can't scrap core
    }

    // Calculate scrap value based on entity type
    let scrapValue = 0;
    
    if (entityType === "Drone") {
      // Drones give small shard bonus
      scrapValue = 0.5;
    } else {
      // Buildings give more based on tier
      const producer = world.producer[entityId];
      const tier = producer?.tier ?? 1;
      scrapValue = 1.0 * tier; // Base value times tier
    }

    // Apply recycle bonus from meta upgrades
    const recycleBonus = state.compilerOptimization.recycleBonus;
    const finalValue = scrapValue * (1 + recycleBonus);

    // Remove entity from world
    delete world.entityType[entityId];
    delete world.position[entityId];
    delete world.inventory[entityId];
    delete world.producer[entityId];
    delete world.heatSource[entityId];
    delete world.heatSink[entityId];
    delete world.powerLink[entityId];
    delete world.droneBrain[entityId];
    delete world.path[entityId];
    delete world.overclockable[entityId];
    delete world.compileEmitter[entityId];

    // Add to scrap bonus
    set({ scrapBonusShards: state.scrapBonusShards + finalValue });

    return finalValue;
  },

  selfTerminate: () => {
    const state = get();
    const world = state.world;

    // Scrap all non-core buildings and drones
    const entitiesToScrap = Object.entries(world.entityType)
      .filter(([_, type]) => type !== "Core")
      .map(([idStr]) => Number(idStr));

    let totalScrapped = 0;
    entitiesToScrap.forEach((id) => {
      totalScrapped += state.scrapEntity(id);
    });

    // Immediately prestige after self-termination
    state.prestigeNow();
  },

  forkProcess: () => {
    const state = get();
    const world = state.world;
    
    // Count and remove all drones
    const droneIds = Object.entries(world.entityType)
      .filter(([_, type]) => type === "Drone")
      .map(([id]) => Number(id));
    
    const droneCount = droneIds.length;
    
    // Remove drones from world
    droneIds.forEach(id => {
      delete world.entityType[id];
      delete world.position[id];
      delete world.inventory[id];
      delete world.droneBrain[id];
      delete world.path[id];
      delete world.powerLink[id];
    });
    
    // Grant fork points (1 per 3 drones sacrificed, minimum 1)
    const earnedPoints = Math.max(1, Math.floor(droneCount / 3));
    
    set({ 
      forkPoints: state.forkPoints + earnedPoints,
    });
    
    console.log(`Fork Process complete: sacrificed ${droneCount} drones, earned ${earnedPoints} fork points`);
  },

  prestigeNow: () => {
    const state = get();
    const world = state.world;

    // Calculate final shards (including scrap bonus)
    const shards = getCompileShardEstimate({
      peakThroughput: world.globals.peakThroughput,
      cohesionScore: world.globals.cohesionScore,
      stressSecondsAccum: world.globals.stressSecondsAccum,
      yieldMult: state.compilerOptimization.compileYieldMult,
    }) + state.scrapBonusShards;

    // Update meta
    set({
      compileShardsBanked: state.compileShardsBanked + shards,
      totalPrestiges: state.totalPrestiges + 1,
    });

    // Create new world with current meta upgrades
    const newWorld = createWorld({
      swarm: state.swarmCognition,
      bio: state.bioStructure,
      compiler: state.compilerOptimization,
    });

    set({
      world: newWorld,
      projectedCompileShards: 0,
      forkPoints: state.compilerOptimization.startingForkPoints,
      selectedEntity: null,
      currentPhase: 1,
      overclockArmed: false,
      scrapBonusShards: 0,
    });
  },

  updateUISnapshot: () => {
    const state = get();
    const world = state.world;

    const heatCurrent = world.globals.heatCurrent;
    const heatSafeCap = world.globals.heatSafeCap;
    const heatRatio = heatSafeCap > 0 ? heatCurrent / heatSafeCap : 0;

    const projectedShards = getCompileShardEstimate({
      peakThroughput: world.globals.peakThroughput,
      cohesionScore: world.globals.cohesionScore,
      stressSecondsAccum: world.globals.stressSecondsAccum,
      yieldMult: state.compilerOptimization.compileYieldMult,
    });

    // Determine phase
    let currentPhase: 1 | 2 | 3 = 1;
    if (world.globals.simTimeSeconds > 5 * 60) currentPhase = 2;
    if (world.globals.overclockEnabled) currentPhase = 3;

    const drones = Object.entries(world.droneBrain).map(([idStr, brain]) => {
      const id = Number(idStr);
      const pos = world.position[id];
      return {
        id,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
        role: brain.role,
        cargoAmount: brain.cargo.amount,
        state: brain.state,
      };
    });

    const buildings = Object.entries(world.entityType)
      .filter(([_, t]) => t !== "Drone")
      .map(([idStr, type]) => {
        const id = Number(idStr);
        const pos = world.position[id];
        const prod = world.producer[id];
        const plink = world.powerLink[id];

        return {
          id,
          x: pos?.x ?? 0,
          y: pos?.y ?? 0,
          type,
          tier: prod?.tier,
          online: plink?.online ?? true,
        };
      });

    const snapshot: UISnapshot = {
      heatCurrent,
      heatSafeCap,
      heatRatio,
      powerAvailable: world.globals.powerAvailable,
      powerDemand: world.globals.powerDemand,
      throughput: world.globals.peakThroughput,
      projectedShards: projectedShards + state.scrapBonusShards,
      currentPhase,
      simTimeSeconds: world.globals.simTimeSeconds,
      overclockEnabled: world.globals.overclockEnabled,
      canFork: currentPhase >= 2,
      canPrestige: currentPhase === 3,
      canSelfTerminate: heatRatio > 1.2 && currentPhase === 3,
      drones,
      buildings,
    };

    set({
      uiSnapshot: snapshot,
      projectedCompileShards: projectedShards,
      currentPhase,
    });
  },
});
