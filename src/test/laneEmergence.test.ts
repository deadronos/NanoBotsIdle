import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../ecs/world/World";
import { congestionSystem } from "../ecs/systems/congestionSystem";
import { DEFAULT_UNLOCK_STATE } from "../types/unlocks";

describe("Lane Emergence", () => {
  let world: World;

  beforeEach(() => {
    world = {
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
      storageHub: {},
      degradable: {},
      entityType: {},
      globals: {
        heatCurrent: 0,
        heatSafeCap: 100,
        powerAvailable: 10,
        powerDemand: 0,
        overclockEnabled: false,
        peakThroughput: 0,
        cohesionScore: 0,
        stressSecondsAccum: 0,
        simTimeSeconds: 0,
        unlocks: { ...DEFAULT_UNLOCK_STATE },
        milestones: [],
        swarmCognition: 0.5, // 50% cognition level
      },
      taskRequests: [],
      builderTargets: {},
      maintenanceRequests: [],
      maintainerTargets: {},
      flowFields: new Map(),
      grid: {
        width: 10,
        height: 10,
        walkCost: new Array(100).fill(1),
      },
    };
  });

  it("should reduce cost on frequently used paths (lane formation)", () => {
    // Create a drone with a path
    const droneId = 1;
    world.position[droneId] = { x: 2, y: 2 };
    world.droneBrain[droneId] = {
      role: "hauler",
      state: "toDropoff",
      cargo: { resource: "Carbon", amount: 5 },
      battery: 1,
      targetEntity: 2,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 1,
      },
    };

    // Create a path through specific tiles
    world.path[droneId] = {
      nodes: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
      ],
      idx: 1, // Currently moving to node 1
    };

    const pathIdx = 2 * 10 + 3; // Position (3, 2)
    const initialCost = world.grid.walkCost[pathIdx];

    // Run congestion system multiple times to build up lane
    for (let i = 0; i < 20; i++) {
      congestionSystem(world, 0.1);
    }

    // The path tile should have reduced cost (lane formed)
    expect(world.grid.walkCost[pathIdx]).toBeLessThan(initialCost);
  });

  it("should not form lanes when swarm cognition is zero", () => {
    world.globals.swarmCognition = 0; // No cognition

    const droneId = 1;
    world.position[droneId] = { x: 2, y: 2 };
    world.droneBrain[droneId] = {
      role: "hauler",
      state: "toDropoff",
      cargo: { resource: "Carbon", amount: 5 },
      battery: 1,
      targetEntity: 2,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 1,
      },
    };

    world.path[droneId] = {
      nodes: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
      idx: 1,
    };

    const pathIdx = 2 * 10 + 3;
    const initialCost = world.grid.walkCost[pathIdx];

    // Run congestion system
    for (let i = 0; i < 20; i++) {
      congestionSystem(world, 0.1);
    }

    // Cost should remain at base (no lane formation without cognition)
    expect(world.grid.walkCost[pathIdx]).toBe(initialCost);
  });

  it("should decay lanes over time when not used", () => {
    // First, create a lane by reducing cost
    const laneIdx = 5 * 10 + 5;
    world.grid.walkCost[laneIdx] = 0.8; // Established lane

    // Run congestion system without any drones using the path
    for (let i = 0; i < 10; i++) {
      congestionSystem(world, 0.2);
    }

    // Lane should decay back toward base cost
    expect(world.grid.walkCost[laneIdx]).toBeGreaterThan(0.8);
    expect(world.grid.walkCost[laneIdx]).toBeLessThanOrEqual(1.0);
  });

  it("should cap lane cost at minimum value", () => {
    // Create a drone that repeatedly uses the same path
    const droneId = 1;
    world.position[droneId] = { x: 5, y: 5 };
    world.droneBrain[droneId] = {
      role: "hauler",
      state: "toDropoff",
      cargo: { resource: "Carbon", amount: 5 },
      battery: 1,
      targetEntity: 2,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 1,
      },
    };

    world.path[droneId] = {
      nodes: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ],
      idx: 1,
    };

    const pathIdx = 5 * 10 + 6;

    // Run congestion system many times
    for (let i = 0; i < 100; i++) {
      congestionSystem(world, 0.1);
    }

    // Should not go below minimum lane cost (0.8)
    expect(world.grid.walkCost[pathIdx]).toBeGreaterThanOrEqual(0.8);
  });

  it("should balance congestion and lane formation", () => {
    // Simulate a busy path with both congestion and lane formation
    world.globals.swarmCognition = 1.0; // Max cognition

    const droneId = 1;
    world.position[droneId] = { x: 5, y: 5 };
    world.droneBrain[droneId] = {
      role: "hauler",
      state: "toDropoff",
      cargo: { resource: "Carbon", amount: 5 },
      battery: 1,
      targetEntity: 2,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 1,
      },
    };

    // Drone is at position and has path through it
    world.path[droneId] = {
      nodes: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ],
      idx: 0,
    };

    const currentIdx = 5 * 10 + 5;

    // Run congestion system
    for (let i = 0; i < 10; i++) {
      congestionSystem(world, 0.1);
    }

    // The tile should have some congestion (drone is there)
    // but not as much as it would without lane benefits
    expect(world.grid.walkCost[currentIdx]).toBeGreaterThan(1.0);
  });
});
