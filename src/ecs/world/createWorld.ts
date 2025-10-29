import { World } from "./World";
import { EntityId } from "./EntityId";
import {
  SwarmCognitionUpgrades,
  BioStructureUpgrades,
  CompilerOptimizationUpgrades,
} from "../../state/metaSlice";
import { BehaviorProfile, RoutingPriorityRule } from "../components/DroneBrain";
import { Recipe } from "../../types/buildings";
import { DroneRole } from "../../types/drones";
import { DEFAULT_UNLOCK_STATE, PROGRESSION_MILESTONES } from "../../types/unlocks";

export interface CreateWorldParams {
  swarm: SwarmCognitionUpgrades;
  bio: BioStructureUpgrades;
  compiler: CompilerOptimizationUpgrades;
}

function makeEntity(world: World, type: string): EntityId {
  const id = world.nextEntityId++;
  world.entityType[id] = type;
  return id;
}

function getBaseBehaviorProfile(swarm: SwarmCognitionUpgrades): BehaviorProfile {
  const defaultRules: RoutingPriorityRule[] = [
    { targetType: "Fabricator", priority: 0 },
    { targetType: "Assembler", priority: 1 },
    { targetType: "Storage", priority: 2 },
  ];

  return {
    priorityRules: defaultRules,
    prefetchCriticalInputs: swarm.prefetchUnlocked,
    buildRadius: 5 + swarm.startingSpecialists.builder,
    congestionAvoidance: swarm.congestionAvoidanceLevel,
  };
}

const START_EXTRACTOR_RECIPE: Recipe = {
  inputs: {},
  outputs: { Carbon: 1 },
  batchTimeSeconds: 1,
};

const START_ASSEMBLER_RECIPE: Recipe = {
  inputs: { Carbon: 2 },
  outputs: { Components: 1 },
  batchTimeSeconds: 2,
};

const START_FABRICATOR_RECIPE: Recipe = {
  inputs: { Components: 3 },
  outputs: { DroneFrame: 1 },
  batchTimeSeconds: 5,
};

export function createWorld(params: CreateWorldParams): World {
  const { swarm, bio } = params;

  const world: World = {
    nextEntityId: 1,

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

    globals: {
      heatCurrent: 0,
      heatSafeCap: 100 + bio.passiveCoolingBonus * 20,
      powerAvailable: 10,
      powerDemand: 0,
      overclockEnabled: false,
      peakThroughput: 0,
      cohesionScore: 0,
      stressSecondsAccum: 0,
      simTimeSeconds: 0,
      unlocks: { ...DEFAULT_UNLOCK_STATE },
      milestones: PROGRESSION_MILESTONES.map((m) => ({
        ...m,
        achieved: false,
        notified: false,
      })),
    },

    taskRequests: [],

    grid: {
      width: 64,
      height: 64,
      walkCost: new Array(64 * 64).fill(1),
    },
  };

  // Create Core
  const coreId = makeEntity(world, "Core");
  world.position[coreId] = { x: 32, y: 32 };
  world.inventory[coreId] = {
    capacity: 999,
    contents: {
      // Add some initial resources so player can interact with the game
      Carbon: 10,
      Components: 20,
      // Apply meta upgrades on top of base starting resources
      ...bio.startingCoreInventory,
    },
  };
  world.heatSource[coreId] = { heatPerSecond: 0.2 };

  if (bio.passiveCoolingBonus > 0) {
    world.heatSink[coreId] = { coolingPerSecond: 0.2 * bio.passiveCoolingBonus };
  }

  world.powerLink[coreId] = { demand: 1, priority: 0, online: true, connectedToGrid: true };
  world.compileEmitter[coreId] = { throughputWeight: 1, cohesionWeight: 1 };

  // Create starting Extractor
  const extractorId = makeEntity(world, "Extractor");
  world.position[extractorId] = { x: 34, y: 32 };
  world.inventory[extractorId] = { capacity: 50, contents: {} };
  world.producer[extractorId] = {
    recipe: START_EXTRACTOR_RECIPE,
    progress: 0,
    baseRate: 1,
    tier: bio.startingExtractorTier,
    active: true,
  };
  world.heatSource[extractorId] = {
    heatPerSecond: 0.5 * bio.startingExtractorTier,
  };
  world.powerLink[extractorId] = { demand: 1, priority: 1, online: true, connectedToGrid: true };
  world.overclockable[extractorId] = {
    safeRateMult: 1.0,
    overRateMult: 2.0,
    heatMultiplier: 3.0,
  };
  world.compileEmitter[extractorId] = {
    throughputWeight: 1,
    cohesionWeight: 0.2,
  };

  // Create starting Assembler
  const assemblerId = makeEntity(world, "Assembler");
  world.position[assemblerId] = { x: 32, y: 34 };
  world.inventory[assemblerId] = { capacity: 50, contents: {} };
  world.producer[assemblerId] = {
    recipe: START_ASSEMBLER_RECIPE,
    progress: 0,
    baseRate: 0.5,
    tier: 1,
    active: true,
  };
  world.heatSource[assemblerId] = { heatPerSecond: 0.7 };
  world.powerLink[assemblerId] = { demand: 2, priority: 2, online: true, connectedToGrid: true };
  world.overclockable[assemblerId] = {
    safeRateMult: 1.0,
    overRateMult: 2.5,
    heatMultiplier: 4.0,
  };
  world.compileEmitter[assemblerId] = {
    throughputWeight: 1,
    cohesionWeight: 0.4,
  };

  // Create starting Fabricator
  const fabId = makeEntity(world, "Fabricator");
  world.position[fabId] = { x: 30, y: 32 };
  world.inventory[fabId] = { capacity: 50, contents: {} };
  world.producer[fabId] = {
    recipe: START_FABRICATOR_RECIPE,
    progress: 0,
    baseRate: 0.25,
    tier: 1,
    active: true,
  };
  world.heatSource[fabId] = { heatPerSecond: 1.0 };
  world.powerLink[fabId] = { demand: 2, priority: 1, online: true, connectedToGrid: true };
  world.overclockable[fabId] = {
    safeRateMult: 1.0,
    overRateMult: 3.0,
    heatMultiplier: 5.0,
  };
  world.compileEmitter[fabId] = {
    throughputWeight: 1,
    cohesionWeight: 0.6,
  };

  // Spawn starting drones
  const baseBehavior = getBaseBehaviorProfile(swarm);

  const startHaulers = 1 + swarm.startingSpecialists.hauler;
  const startBuilders = 1 + swarm.startingSpecialists.builder;
  const startMaintainers = 0 + swarm.startingSpecialists.maintainer;

  function spawnDrone(role: DroneRole, x: number, y: number) {
    const dId = makeEntity(world, "Drone");
    world.position[dId] = { x, y };
    world.inventory[dId] = { capacity: 5, contents: {} };
    world.droneBrain[dId] = {
      role,
      state: "idle",
      cargo: { resource: null, amount: 0 },
      battery: 1,
      targetEntity: null,
      behavior: {
        ...baseBehavior,
        buildRadius: role === "builder" ? baseBehavior.buildRadius + 2 : baseBehavior.buildRadius,
      },
    };
    world.powerLink[dId] = { demand: 0.1, priority: 0, online: true, connectedToGrid: true };
  }

  for (let i = 0; i < startHaulers; i++) {
    spawnDrone("hauler", 32, 32);
  }
  for (let i = 0; i < startBuilders; i++) {
    spawnDrone("builder", 32, 32);
  }
  for (let i = 0; i < startMaintainers; i++) {
    spawnDrone("maintainer", 32, 32);
  }

  return world;
}
