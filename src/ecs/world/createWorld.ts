import type { GridData } from "../../types/entities";
import type { Recipe } from "../../types/recipes";
import type {
  BioStructureUpgrades,
  CompilerOptimizationUpgrades,
  StartingSpecialists,
  SwarmCognitionUpgrades,
} from "../../state/types";
import { INVALID_ENTITY_ID, type EntityId } from "./EntityId";
import type { World, WorldGlobals } from "./World";
import type { EntityType } from "../../types/entities";

const DEFAULT_GRID_SIZE = 64;
const BASE_CORE_CAPACITY = 500;
const BASE_POWER_AVAILABLE = 12;
const BASE_CORE_HEAT = 0.2;
const BASE_DRONE_CAPACITY = 5;
const BASE_DRONE_SPEED = 1;

const clampPositive = (value: number, fallback = 0): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const createDefaultGrid = (size = DEFAULT_GRID_SIZE): GridData => {
  const isWithinBounds = (value: number) => value >= 0 && value < size;
  return {
    width: size,
    height: size,
    isWalkable: (x, y) => isWithinBounds(x) && isWithinBounds(y),
    getTraversalCost: () => 1,
  };
};

const createBaseGlobals = (): WorldGlobals => ({
  heatCurrent: 0,
  heatSafeCap: 0,
  powerAvailable: 0,
  powerDemand: 0,
  overclockEnabled: false,
  peakThroughput: 0,
  throughputPerSec: 0,
  cohesionScore: 0,
  stressSecondsAccum: 0,
  simTimeSeconds: 0,
  projectedShards: 0,
});

const createEmptyWorld = (initialEntityId: EntityId): World => ({
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
  globals: createBaseGlobals(),
  taskRequests: [],
  pathRequests: [],
  grid: createDefaultGrid(),
  cellTraversalPenalty: {},
});

const createDefaultSpecialists = (): StartingSpecialists => ({
  hauler: 0,
  builder: 0,
  maintainer: 0,
});

const createDefaultSwarm = (): SwarmCognitionUpgrades => ({
  congestionAvoidanceLevel: 0,
  prefetchUnlocked: false,
  startingSpecialists: createDefaultSpecialists(),
});

const createDefaultBio = (): BioStructureUpgrades => ({
  startingRadius: 4,
  startingExtractorTier: 1,
  passiveCoolingBonus: 0,
});

const createDefaultCompiler = (): CompilerOptimizationUpgrades => ({
  compileYieldMult: 1,
  overclockEfficiencyBonus: 0,
  recycleBonus: 0,
});

export interface CreateWorldMeta {
  swarm: SwarmCognitionUpgrades;
  bio: BioStructureUpgrades;
  compiler: CompilerOptimizationUpgrades;
}

type PartialSpecialists = Partial<StartingSpecialists>;

export interface PartialCreateWorldMeta {
  swarm?: Partial<SwarmCognitionUpgrades> & {
    startingSpecialists?: PartialSpecialists;
  };
  bio?: Partial<BioStructureUpgrades>;
  compiler?: Partial<CompilerOptimizationUpgrades>;
}

export interface CreateWorldOptions {
  meta?: PartialCreateWorldMeta | CreateWorldMeta;
  initialEntityId?: EntityId;
  spawnEntities?: boolean;
}

export type CreateWorldParams =
  | CreateWorldMeta
  | CreateWorldOptions
  | undefined;

const isCreateWorldMeta = (value: unknown): value is CreateWorldMeta => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.swarm !== undefined &&
    candidate.bio !== undefined &&
    candidate.compiler !== undefined
  );
};

const mergeSpecialists = (
  partial: PartialSpecialists | undefined,
): StartingSpecialists => {
  const defaults = createDefaultSpecialists();
  return {
    hauler: partial?.hauler ?? defaults.hauler,
    builder: partial?.builder ?? defaults.builder,
    maintainer: partial?.maintainer ?? defaults.maintainer,
  };
};

const mergeSwarm = (
  partial: (PartialCreateWorldMeta["swarm"] | SwarmCognitionUpgrades) | undefined,
): SwarmCognitionUpgrades => {
  if (!partial) {
    return createDefaultSwarm();
  }

  const defaults = createDefaultSwarm();
  const partialSpecialists =
    "startingSpecialists" in partial
      ? (partial.startingSpecialists as PartialSpecialists | undefined)
      : undefined;

  return {
    congestionAvoidanceLevel:
      partial.congestionAvoidanceLevel ?? defaults.congestionAvoidanceLevel,
    prefetchUnlocked: partial.prefetchUnlocked ?? defaults.prefetchUnlocked,
    startingSpecialists: mergeSpecialists(partialSpecialists),
  };
};

const mergeBio = (
  partial: BioStructureUpgrades | Partial<BioStructureUpgrades> | undefined,
): BioStructureUpgrades => {
  if (!partial) {
    return createDefaultBio();
  }

  const defaults = createDefaultBio();
  return {
    startingRadius: partial.startingRadius ?? defaults.startingRadius,
    startingExtractorTier:
      partial.startingExtractorTier ?? defaults.startingExtractorTier,
    passiveCoolingBonus:
      partial.passiveCoolingBonus ?? defaults.passiveCoolingBonus,
  };
};

const mergeCompiler = (
  partial:
    | CompilerOptimizationUpgrades
    | Partial<CompilerOptimizationUpgrades>
    | undefined,
): CompilerOptimizationUpgrades => {
  if (!partial) {
    return createDefaultCompiler();
  }

  const defaults = createDefaultCompiler();
  return {
    compileYieldMult: partial.compileYieldMult ?? defaults.compileYieldMult,
    overclockEfficiencyBonus:
      partial.overclockEfficiencyBonus ?? defaults.overclockEfficiencyBonus,
    recycleBonus: partial.recycleBonus ?? defaults.recycleBonus,
  };
};

const normalizeMeta = (
  meta?: PartialCreateWorldMeta | CreateWorldMeta,
): CreateWorldMeta => {
  if (isCreateWorldMeta(meta)) {
    return {
      swarm: mergeSwarm(meta.swarm),
      bio: mergeBio(meta.bio),
      compiler: mergeCompiler(meta.compiler),
    };
  }

  const partial = meta ?? {};
  return {
    swarm: mergeSwarm(partial.swarm),
    bio: mergeBio(partial.bio),
    compiler: mergeCompiler(partial.compiler),
  };
};

interface NormalizedParams {
  meta: CreateWorldMeta;
  initialEntityId: EntityId;
  spawnEntities: boolean;
}

const normalizeParams = (input?: CreateWorldParams): NormalizedParams => {
  if (isCreateWorldMeta(input)) {
    return {
      meta: normalizeMeta(input),
      initialEntityId: 0,
      spawnEntities: true,
    };
  }

  const options = (input ?? {}) as CreateWorldOptions;
  return {
    meta: normalizeMeta(options.meta),
    initialEntityId: options.initialEntityId ?? 0,
    spawnEntities: options.spawnEntities ?? true,
  };
};

const computeGridSize = (startingRadius: number): number => {
  const radius = Math.max(4, Math.floor(clampPositive(startingRadius, 4)));
  const diameter = radius * 2 + 1;
  return Math.max(DEFAULT_GRID_SIZE, diameter + 8);
};

const configureGrid = (
  world: World,
  bio: BioStructureUpgrades,
): { centerX: number; centerY: number } => {
  const gridSize = computeGridSize(bio.startingRadius);
  world.grid = createDefaultGrid(gridSize);
  const center = Math.floor(gridSize / 2);
  return { centerX: center, centerY: center };
};

const applyGlobalModifiers = (world: World, meta: CreateWorldMeta): void => {
  const { bio, compiler } = meta;
  world.globals.heatCurrent = 0;
  world.globals.heatSafeCap = 100 + bio.passiveCoolingBonus * 20;
  world.globals.powerDemand = 0;
  world.globals.powerAvailable =
    BASE_POWER_AVAILABLE + Math.max(0, compiler.overclockEfficiencyBonus);
  world.globals.overclockEnabled = false;
  world.globals.peakThroughput = 0;
  world.globals.throughputPerSec = 0;
  world.globals.cohesionScore = 0;
  world.globals.stressSecondsAccum = 0;
  world.globals.simTimeSeconds = 0;
  world.globals.projectedShards = 0;
};

const registerEntity = (world: World, type: EntityType): EntityId => {
  const id = allocateEntityId(world);
  world.entityType[id] = type;
  return id;
};

const CORE_POSITION_OFFSET = { x: 0, y: 0 };
const EXTRACTOR_OFFSET = { x: 2, y: 0 };
const ASSEMBLER_OFFSET = { x: 0, y: 2 };
const FABRICATOR_OFFSET = { x: -2, y: 0 };

const createInventory = (capacity: number, contents: Record<string, number> = {}) => ({
  capacity,
  contents: { ...contents },
});

const extractorRecipe: Recipe = {
  inputs: {},
  outputs: { Carbon: 1 },
  baseBatchSize: 1,
};

const assemblerRecipe: Recipe = {
  inputs: { Carbon: 2 },
  outputs: { Components: 1 },
  baseBatchSize: 1,
};

const fabricatorRecipe: Recipe = {
  inputs: { Components: 3 },
  outputs: { DroneFrame: 1 },
  baseBatchSize: 1,
};

const offsetPosition = (
  centerX: number,
  centerY: number,
  offset: { x: number; y: number },
) => ({
  x: centerX + offset.x,
  y: centerY + offset.y,
});

const spawnCore = (
  world: World,
  centerX: number,
  centerY: number,
  meta: CreateWorldMeta,
): EntityId => {
  const coreId = registerEntity(world, "core");
  world.position[coreId] = offsetPosition(centerX, centerY, CORE_POSITION_OFFSET);
  world.inventory[coreId] = createInventory(BASE_CORE_CAPACITY, {
    Components: 5 + meta.bio.passiveCoolingBonus,
  });
  world.heatSource[coreId] = { heatPerSecond: BASE_CORE_HEAT };

  if (meta.bio.passiveCoolingBonus > 0) {
    world.heatSink[coreId] = {
      coolingPerSecond: 0.2 * meta.bio.passiveCoolingBonus,
    };
  }

  world.powerLink[coreId] = { demand: 1, priority: 0, online: true };
  world.compileEmitter[coreId] = {
    compileRate: Math.max(1, meta.compiler.compileYieldMult),
    isActive: true,
  };

  return coreId;
};

const spawnExtractor = (
  world: World,
  centerX: number,
  centerY: number,
  meta: CreateWorldMeta,
): EntityId => {
  const extractorId = registerEntity(world, "building");
  world.position[extractorId] = offsetPosition(
    centerX,
    centerY,
    EXTRACTOR_OFFSET,
  );
  world.inventory[extractorId] = createInventory(60);
  world.producer[extractorId] = {
    recipe: extractorRecipe,
    progress: 0,
    baseRate: 1,
    tier: Math.max(1, meta.bio.startingExtractorTier),
    active: true,
  };
  world.heatSource[extractorId] = {
    heatPerSecond: 0.5 * Math.max(1, meta.bio.startingExtractorTier),
  };
  world.powerLink[extractorId] = { demand: 1.5, priority: 1, online: true };
  world.overclockable[extractorId] = {
    overclockLevel: 0,
    maxLevel: 3 + Math.max(0, meta.compiler.overclockEfficiencyBonus),
  };
  world.compileEmitter[extractorId] = {
    compileRate: 0.5,
    isActive: true,
  };
  return extractorId;
};

const spawnAssembler = (
  world: World,
  centerX: number,
  centerY: number,
): EntityId => {
  const assemblerId = registerEntity(world, "building");
  world.position[assemblerId] = offsetPosition(
    centerX,
    centerY,
    ASSEMBLER_OFFSET,
  );
  world.inventory[assemblerId] = createInventory(60);
  world.producer[assemblerId] = {
    recipe: assemblerRecipe,
    progress: 0,
    baseRate: 0.6,
    tier: 1,
    active: true,
  };
  world.heatSource[assemblerId] = { heatPerSecond: 0.7 };
  world.powerLink[assemblerId] = { demand: 2, priority: 2, online: true };
  world.overclockable[assemblerId] = { overclockLevel: 0, maxLevel: 3 };
  world.compileEmitter[assemblerId] = { compileRate: 0.4, isActive: true };
  return assemblerId;
};

const spawnFabricator = (
  world: World,
  centerX: number,
  centerY: number,
): EntityId => {
  const fabricatorId = registerEntity(world, "building");
  world.position[fabricatorId] = offsetPosition(
    centerX,
    centerY,
    FABRICATOR_OFFSET,
  );
  world.inventory[fabricatorId] = createInventory(60);
  world.producer[fabricatorId] = {
    recipe: fabricatorRecipe,
    progress: 0,
    baseRate: 0.3,
    tier: 1,
    active: true,
  };
  world.heatSource[fabricatorId] = { heatPerSecond: 1 };
  world.powerLink[fabricatorId] = { demand: 2, priority: 1, online: true };
  world.overclockable[fabricatorId] = { overclockLevel: 0, maxLevel: 3 };
  world.compileEmitter[fabricatorId] = { compileRate: 0.3, isActive: true };
  return fabricatorId;
};

/**
 * Spawn a building of the given type at the provided world coordinates.
 * This is a canonical helper used by UI placement logic.
 */
export const spawnBuildingAt = (
  world: World,
  type: string,
  x: number,
  y: number,
): EntityId => {
  const t = type.toLowerCase();
  // Use existing specialized spawners when possible; they expect a center
  // anchor so call them with x,y as center offsets.
  switch (t) {
    case "extractor":
      return spawnExtractor(world, x, y, { swarm: createDefaultSwarm(), bio: createDefaultBio(), compiler: createDefaultCompiler() });
    case "assembler":
      return spawnAssembler(world, x, y);
    case "fabricator":
      return spawnFabricator(world, x, y);
    case "cooler": {
      const id = registerEntity(world, "building");
      world.position[id] = { x, y };
      world.inventory[id] = createInventory(40);
      world.heatSink[id] = { coolingPerSecond: 1 };
      world.powerLink[id] = { demand: 0.5, priority: 2, online: true };
      return id;
    }
    case "storage": {
      const id = registerEntity(world, "building");
      world.position[id] = { x, y };
      world.inventory[id] = createInventory(200);
      world.powerLink[id] = { demand: 0.2, priority: 3, online: true };
      return id;
    }
    default: {
      const id = registerEntity(world, "building");
      world.position[id] = { x, y };
      world.inventory[id] = createInventory(60);
      world.powerLink[id] = { demand: 0.5, priority: 3, online: true };
      return id;
    }
  }
};

const spawnDrone = (
  world: World,
  centerX: number,
  centerY: number,
  role: "hauler" | "builder" | "maintainer",
  speedModifier: number,
): void => {
  const droneId = registerEntity(world, "drone");
  world.position[droneId] = { x: centerX, y: centerY };
  world.inventory[droneId] = createInventory(BASE_DRONE_CAPACITY);
  world.droneBrain[droneId] = {
    role,
    state: "idle",
    currentTaskId: undefined,
    pendingPathId: undefined,
    moveProgress: 0,
    speed: Math.max(0.5, BASE_DRONE_SPEED + speedModifier),
  };
  world.powerLink[droneId] = { demand: 0.1, priority: 3, online: true };
};

const spawnDrones = (
  world: World,
  centerX: number,
  centerY: number,
  swarm: SwarmCognitionUpgrades,
): void => {
  const baseCount = 1;
  const speedBoost = Math.min(0.5, swarm.congestionAvoidanceLevel * 0.1);

  const haulers = baseCount + Math.max(0, swarm.startingSpecialists.hauler);
  const builders = baseCount + Math.max(0, swarm.startingSpecialists.builder);
  const maintainers = Math.max(0, swarm.startingSpecialists.maintainer);

  for (let i = 0; i < haulers; i += 1) {
    spawnDrone(world, centerX, centerY, "hauler", speedBoost);
  }
  for (let i = 0; i < builders; i += 1) {
    spawnDrone(world, centerX, centerY, "builder", speedBoost);
  }
  for (let i = 0; i < maintainers; i += 1) {
    spawnDrone(world, centerX, centerY, "maintainer", speedBoost);
  }
};

const updateAggregatePower = (world: World): void => {
  const totalDemand = Object.values(world.powerLink).reduce((sum, link) => {
    if (!link?.online) {
      return sum;
    }
    return sum + clampPositive(link.demand);
  }, 0);

  world.globals.powerDemand = clampPositive(totalDemand);
  world.globals.powerAvailable = Math.max(
    world.globals.powerAvailable,
    world.globals.powerDemand + 2,
  );
};

const populateWorld = (world: World, meta: CreateWorldMeta): void => {
  const { centerX, centerY } = configureGrid(world, meta.bio);
  applyGlobalModifiers(world, meta);

  spawnCore(world, centerX, centerY, meta);
  spawnExtractor(world, centerX, centerY, meta);
  spawnAssembler(world, centerX, centerY);
  spawnFabricator(world, centerX, centerY);
  spawnDrones(world, centerX, centerY, meta.swarm);

  // Make grid traversal cost consult world.cellTraversalPenalty if present.
  // This allows congestion / occupancy to dynamically influence A* traversal cost.
  const originalGetTraversal = world.grid.getTraversalCost;
  world.grid.getTraversalCost = (x: number, y: number) => {
    const key = `${x},${y}`;
    const penalty = world.cellTraversalPenalty?.[key] ?? 0;
    const base = typeof originalGetTraversal === "function" ? originalGetTraversal(x, y) : 0;
    return Math.max(0, base + (penalty ?? 0));
  };

  updateAggregatePower(world);
};

export const allocateEntityId = (world: World): EntityId => {
  const id = world.nextEntityId;
  world.nextEntityId += 1;
  return id;
};

export const createWorld = (params?: CreateWorldParams): World => {
  const normalized = normalizeParams(params);
  const world = createEmptyWorld(normalized.initialEntityId);

  if (normalized.spawnEntities) {
    populateWorld(world, normalized.meta);
  }

  return world;
};

export const resetWorld = (world: World): void => {
  const empty = createEmptyWorld(0);
  world.nextEntityId = empty.nextEntityId;
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
  world.globals = createBaseGlobals();
  world.taskRequests = [];
  world.pathRequests = [];
  world.grid = createDefaultGrid();
  world.cellTraversalPenalty = {};
};

export const isValidEntityId = (entityId: EntityId): boolean =>
  entityId !== INVALID_ENTITY_ID && entityId >= 0;
