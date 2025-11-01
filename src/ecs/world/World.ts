import type { CompileEmitterStore } from "../components/CompileEmitter";
import type { DroneBrainStore } from "../components/DroneBrain";
import type { HeatSinkStore, HeatSourceStore } from "../components/HeatSource";
import type { InventoryStore } from "../components/Inventory";
import type { OverclockableStore } from "../components/Overclockable";
import type { PathStore } from "../components/Path";
import type { PositionStore } from "../components/Position";
import type { PowerLinkStore } from "../components/PowerLink";
import type { ProducerStore } from "../components/Producer";
import type {
  EntityType,
  GridData,
  PathRequest,
  TaskRequest,
} from "../../types/entities";
import type { EntityId } from "./EntityId";

export interface WorldGlobals {
  heatCurrent: number;
  heatSafeCap: number;
  powerAvailable: number;
  powerDemand: number;
  overclockEnabled: boolean;
  peakThroughput: number;
  cohesionScore: number;
  stressSecondsAccum: number;
  simTimeSeconds: number;
}

export interface World {
  nextEntityId: EntityId;
  position: PositionStore;
  inventory: InventoryStore;
  producer: ProducerStore;
  heatSource: HeatSourceStore;
  heatSink: HeatSinkStore;
  powerLink: PowerLinkStore;
  droneBrain: DroneBrainStore;
  path: PathStore;
  overclockable: OverclockableStore;
  compileEmitter: CompileEmitterStore;
  entityType: Record<EntityId, EntityType>;
  globals: WorldGlobals;
  taskRequests: TaskRequest[];
  pathRequests: PathRequest[];
  grid: GridData;
}
