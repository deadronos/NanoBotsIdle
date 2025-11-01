import type { World } from "../ecs/world/World";
import type { EntityId } from "../ecs/world/EntityId";

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
    // Cargo contents keyed by resource name
    cargo?: Record<string, number>;
  }>;
  buildings: Array<{
    id: number;
    x: number;
    y: number;
    type: string;
    tier?: number;
    online?: boolean;
    heat?: number;
    // Inventory snapshot (resource => amount)
    inventory?: Record<string, number>;
  }>;
}

export interface StartingSpecialists {
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
