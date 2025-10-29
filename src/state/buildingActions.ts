import { World } from "../ecs/world/World";
import { BuildingType, Recipe } from "../types/buildings";
import { getDroneFabricationCost } from "../sim/balance";
import { DroneRole } from "../types/drones";
import { BehaviorProfile } from "../ecs/components/DroneBrain";

// Building recipes
const RECIPES: Record<BuildingType, Recipe | null> = {
  Core: null,
  Extractor: { inputs: {}, outputs: { Carbon: 1 }, batchTimeSeconds: 1 },
  Assembler: { inputs: { Carbon: 2 }, outputs: { Components: 1 }, batchTimeSeconds: 2 },
  Fabricator: { inputs: { Components: 3 }, outputs: { DroneFrame: 1 }, batchTimeSeconds: 5 },
  Storage: null,
  PowerVein: null,
  Cooler: null,
  CoreCompiler: null,
};

// Building costs
export const BUILDING_COSTS: Record<BuildingType, Record<string, number>> = {
  Core: {},
  Extractor: { Components: 10 },
  Assembler: { Components: 20, TissueMass: 5 },
  Fabricator: { Components: 30, TissueMass: 10 },
  Storage: { Components: 15 },
  PowerVein: { Components: 5 },
  Cooler: { Components: 25, TissueMass: 10 },
  CoreCompiler: { Components: 100, TissueMass: 50 },
};

export function canAffordBuilding(world: World, buildingType: BuildingType): boolean {
  const cost = BUILDING_COSTS[buildingType];
  if (!cost) return false;

  // Find Core inventory
  const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
  if (!coreId) return false;

  const coreInv = world.inventory[Number(coreId)];
  if (!coreInv) return false;

  // Check if we have enough resources
  for (const [resource, amount] of Object.entries(cost)) {
    const have = coreInv.contents[resource as keyof typeof coreInv.contents] || 0;
    if (have < amount) return false;
  }

  return true;
}

export function placeBuilding(
  world: World,
  buildingType: BuildingType,
  x: number,
  y: number
): boolean {
  // Check if we can afford it
  if (!canAffordBuilding(world, buildingType)) {
    console.log("Cannot afford building:", buildingType);
    return false;
  }

  // Check if position is available
  for (const pos of Object.values(world.position)) {
    if (Math.abs(pos.x - x) < 1 && Math.abs(pos.y - y) < 1) {
      console.log("Position occupied");
      return false;
    }
  }

  // Deduct cost from Core
  const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
  if (!coreId) return false;

  const coreInv = world.inventory[Number(coreId)];
  if (!coreInv) return false;

  const cost = BUILDING_COSTS[buildingType];
  for (const [resource, amount] of Object.entries(cost)) {
    coreInv.contents[resource as keyof typeof coreInv.contents] = 
      (coreInv.contents[resource as keyof typeof coreInv.contents] || 0) - amount;
  }

  // Create building entity
  const id = world.nextEntityId++;
  world.entityType[id] = buildingType;
  world.position[id] = { x, y };
  world.inventory[id] = { capacity: 50, contents: {} };
  world.powerLink[id] = { demand: 2, priority: 1, online: true };

  // Add producer component if applicable
  const recipe = RECIPES[buildingType];
  if (recipe) {
    world.producer[id] = {
      recipe,
      progress: 0,
      baseRate: buildingType === "Extractor" ? 1 : buildingType === "Assembler" ? 0.5 : 0.25,
      tier: 1,
      active: true,
    };
    world.heatSource[id] = {
      heatPerSecond: buildingType === "Extractor" ? 0.5 : buildingType === "Assembler" ? 0.7 : 1.0,
    };
    world.overclockable[id] = {
      safeRateMult: 1.0,
      overRateMult: buildingType === "Extractor" ? 2.0 : buildingType === "Assembler" ? 2.5 : 3.0,
      heatMultiplier: buildingType === "Extractor" ? 3.0 : buildingType === "Assembler" ? 4.0 : 5.0,
    };
    world.compileEmitter[id] = {
      throughputWeight: 1,
      cohesionWeight: 0.5,
    };
  }

  // Add cooler component if Cooler
  if (buildingType === "Cooler") {
    world.heatSink[id] = { coolingPerSecond: 2.0 };
  }

  console.log(`Placed ${buildingType} at (${x}, ${y})`);
  return true;
}

export function fabricateDrone(
  world: World,
  role: DroneRole,
  defaultBehavior: BehaviorProfile
): boolean {
  // Find Fabricator
  const fabId = Object.entries(world.entityType).find(([_, type]) => type === "Fabricator")?.[0];
  if (!fabId) return false;

  const fabInv = world.inventory[Number(fabId)];
  if (!fabInv) return false;

  // Count existing drones to determine cost
  const droneCount = Object.keys(world.droneBrain).length + 1;
  const cost = getDroneFabricationCost(droneCount);

  // Check if Fabricator has enough DroneFrames
  const have = fabInv.contents.DroneFrame || 0;
  const needed = cost.Components || 0;
  if (have < needed) {
    console.log("Not enough DroneFrames in Fabricator");
    return false;
  }

  // Deduct cost
  fabInv.contents.DroneFrame = (fabInv.contents.DroneFrame || 0) - needed;

  // Create drone
  const dId = world.nextEntityId++;
  world.entityType[dId] = "Drone";
  
  // Find Fabricator position to spawn near it
  const fabPos = world.position[Number(fabId)];
  world.position[dId] = { x: fabPos.x, y: fabPos.y };
  
  world.inventory[dId] = { capacity: 5, contents: {} };
  world.droneBrain[dId] = {
    role,
    state: "idle",
    cargo: { resource: null, amount: 0 },
    battery: 1,
    targetEntity: null,
    behavior: {
      ...defaultBehavior,
      buildRadius: role === "builder" ? defaultBehavior.buildRadius + 2 : defaultBehavior.buildRadius,
    },
  };
  world.powerLink[dId] = { demand: 0.1, priority: 0, online: true };

  console.log(`Fabricated ${role} drone`);
  return true;
}
