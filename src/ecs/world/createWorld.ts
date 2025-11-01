import type { GridData } from "../../types/entities";
import { INVALID_ENTITY_ID, type EntityId } from "./EntityId";
import type { World, WorldGlobals } from "./World";

const createDefaultGrid = (): GridData => ({
  width: 0,
  height: 0,
  isWalkable: () => true,
});

const createInitialGlobals = (): WorldGlobals => ({
  heatCurrent: 0,
  heatSafeCap: 100,
  powerAvailable: 0,
  powerDemand: 0,
  overclockEnabled: false,
  peakThroughput: 0,
  cohesionScore: 0,
  stressSecondsAccum: 0,
  simTimeSeconds: 0,
});

export const createWorld = (initialEntityId: EntityId = 0): World => ({
  nextEntityId: initialEntityId,
  position: {},
  inventory: {},
  producer: {},
  heatSource: {},
  heatSink: {},
  powerLink: {},
  droneBrain: {},
  path: {},
  overclockable: {},
  compileEmitter: {},
  entityType: {},
  globals: createInitialGlobals(),
  taskRequests: [],
  pathRequests: [],
  grid: createDefaultGrid(),
});

export const allocateEntityId = (world: World): EntityId => {
  const id = world.nextEntityId;
  world.nextEntityId += 1;
  return id;
};

export const resetWorld = (world: World): void => {
  world.nextEntityId = 0;
  world.position = {};
  world.inventory = {};
  world.producer = {};
  world.heatSource = {};
  world.heatSink = {};
  world.powerLink = {};
  world.droneBrain = {};
  world.path = {};
  world.overclockable = {};
  world.compileEmitter = {};
  world.entityType = {};
  world.globals = createInitialGlobals();
  world.taskRequests = [];
  world.pathRequests = [];
  world.grid = createDefaultGrid();
};

export const isValidEntityId = (entityId: EntityId): boolean =>
  entityId !== INVALID_ENTITY_ID && entityId >= 0;
