import { create } from "zustand";

import { createWorld } from "../ecs/world/createWorld";
import type { EntityId } from "../ecs/world/EntityId";
import type { World } from "../ecs/world/World";

export type Phase = 1 | 2 | 3;

export interface UISnapshot {
  heatCurrent: number;
  heatSafeCap: number;
  heatRatio: number;
  powerAvailable: number;
  powerDemand: number;
  throughput: number;
  projectedShards: number;
  currentPhase: Phase;
  simTimeSeconds: number;
  overclockEnabled: boolean;
  canFork: boolean;
  canPrestige: boolean;
  bottlenecks: string[];
  drones: Array<{
    id: number;
    x: number;
    y: number;
    role: string;
  }>;
  buildings: Array<{
    id: number;
    x: number;
    y: number;
    type: string;
    tier?: number;
    online?: boolean;
    heat?: number;
  }>;
}

const createInitialSnapshot = (): UISnapshot => ({
  heatCurrent: 0,
  heatSafeCap: 0,
  heatRatio: 0,
  powerAvailable: 0,
  powerDemand: 0,
  throughput: 0,
  projectedShards: 0,
  currentPhase: 1,
  simTimeSeconds: 0,
  overclockEnabled: false,
  canFork: false,
  canPrestige: false,
  bottlenecks: [],
  drones: [],
  buildings: [],
});

interface StartingSpecialists {
  hauler: number;
  builder: number;
  maintainer: number;
}

export interface SwarmCognitionUpgrades {
  congestionAvoidanceLevel: number;
  prefetchUnlocked: boolean;
  startingSpecialists: StartingSpecialists;
}

export interface BioStructureUpgrades {
  startingRadius: number;
  startingExtractorTier: number;
  passiveCoolingBonus: number;
}

export interface CompilerOptimizationUpgrades {
  compileYieldMult: number;
  overclockEfficiencyBonus: number;
  recycleBonus: number;
}

export interface MetaSlice {
  compileShardsBanked: number;
  totalPrestiges: number;
  swarmCognition: SwarmCognitionUpgrades;
  bioStructure: BioStructureUpgrades;
  compilerOptimization: CompilerOptimizationUpgrades;
  spendShards(tree: "swarm" | "bio" | "compiler", upgradeId: string): void;
}

export interface RunSlice {
  world: World;
  uiSnapshot: UISnapshot;
  projectedCompileShards: number;
  forkPoints: number;
  selectedEntity: EntityId | null;
  currentPhase: Phase;
  overclockArmed: boolean;
  placeBuilding(type: string, x: number, y: number): void;
  queueGhostBuilding(type: string, x: number, y: number): void;
  triggerFork(): void;
  toggleOverclock(on: boolean): void;
  prestigeNow(): void;
  setWorld(world: World): void;
  setUISnapshot(snapshot: UISnapshot): void;
  setProjectedShards(shards: number): void;
  setPhase(phase: Phase): void;
  addForkPoints(amount: number): void;
  setSelectedEntity(entityId: EntityId | null): void;
}

export type GameState = MetaSlice & RunSlice;

const warnUnimplemented = (message: string, ...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.warn(`[GameStore] ${message}`, ...args);
};

export const useGameStore = create<GameState>()((set, get) => ({
  compileShardsBanked: 0,
  totalPrestiges: 0,
  swarmCognition: {
    congestionAvoidanceLevel: 0,
    prefetchUnlocked: false,
    startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
  },
  bioStructure: {
    startingRadius: 4,
    startingExtractorTier: 1,
    passiveCoolingBonus: 0,
  },
  compilerOptimization: {
    compileYieldMult: 1,
    overclockEfficiencyBonus: 0,
    recycleBonus: 0,
  },
  spendShards: (tree, upgradeId) => {
    warnUnimplemented("spendShards stub invoked", tree, upgradeId);
  },
  world: createWorld(),
  uiSnapshot: createInitialSnapshot(),
  projectedCompileShards: 0,
  forkPoints: 0,
  selectedEntity: null,
  currentPhase: 1,
  overclockArmed: false,
  placeBuilding: (type, x, y) => {
    warnUnimplemented("placeBuilding stub invoked", type, { x, y });
  },
  queueGhostBuilding: (type, x, y) => {
    warnUnimplemented("queueGhostBuilding stub invoked", type, { x, y });
  },
  triggerFork: () => {
    warnUnimplemented("triggerFork stub invoked");
  },
  toggleOverclock: (on) => {
    const state = get();
    state.world.globals.overclockEnabled = on;
    set({ overclockArmed: on });
  },
  prestigeNow: () => {
    warnUnimplemented("prestigeNow stub invoked");
  },
  setWorld: (world) => set({ world }),
  setUISnapshot: (snapshot) => set({ uiSnapshot: snapshot }),
  setProjectedShards: (shards) =>
    set({ projectedCompileShards: Math.max(0, Number.isFinite(shards) ? shards : 0) }),
  setPhase: (phase) => set({ currentPhase: phase }),
  addForkPoints: (amount) =>
    set((state) => ({
      forkPoints: Math.max(0, state.forkPoints + (Number.isFinite(amount) ? amount : 0)),
    })),
  setSelectedEntity: (entityId) => set({ selectedEntity: entityId }),
}));
