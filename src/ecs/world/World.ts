import { EntityId } from "./EntityId";
import { Position } from "../components/Position";
import { Inventory } from "../components/Inventory";
import { Producer } from "../components/Producer";
import { HeatSource, HeatSink } from "../components/HeatSource";
import { PowerLink } from "../components/PowerLink";
import { DroneBrain } from "../components/DroneBrain";
import { Path } from "../components/Path";
import { Overclockable } from "../components/Overclockable";
import { CompileEmitter } from "../components/CompileEmitter";
import { Recyclable } from "../components/Recyclable";
import { ResourceName } from "../../types/resources";
import { UnlockState, ProgressionMilestone } from "../../types/unlocks";

export interface TaskRequest {
  requestEntity: EntityId;
  resource: ResourceName;
  amountNeeded: number;
  priorityScore: number;
  createdAt: number;
}

export interface GridData {
  width: number;
  height: number;
  walkCost: number[];
}

export interface World {
  nextEntityId: EntityId;

  // Component stores
  position: Record<EntityId, Position>;
  inventory: Record<EntityId, Inventory>;
  producer: Record<EntityId, Producer>;
  heatSource: Record<EntityId, HeatSource>;
  heatSink: Record<EntityId, HeatSink>;
  powerLink: Record<EntityId, PowerLink>;
  droneBrain: Record<EntityId, DroneBrain>;
  path: Record<EntityId, Path>;
  overclockable: Record<EntityId, Overclockable>;
  compileEmitter: Record<EntityId, CompileEmitter>;
  recyclable?: Record<EntityId, Recyclable>; // Optional: for recycling/refund mechanics

  // Entity metadata
  entityType: Record<EntityId, string>;

  // Global run-level stats/conditions
  globals: {
    heatCurrent: number;
    heatSafeCap: number;
    powerAvailable: number;
    powerDemand: number;
    overclockEnabled: boolean;
    peakThroughput: number;
    cohesionScore: number;
    stressSecondsAccum: number;
    simTimeSeconds: number;
    unlocks: UnlockState;
    milestones: ProgressionMilestone[];
  };

  // Task requests waiting for haulers
  taskRequests: TaskRequest[];

  // Builder coordination: track which entities are already being built
  builderTargets: Record<EntityId, EntityId>; // maps target entity -> builder drone

  // Pathfinding grid
  grid: GridData;
}
