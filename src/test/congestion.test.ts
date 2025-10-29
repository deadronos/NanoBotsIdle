import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../ecs/world/World";
import { congestionSystem } from "../ecs/systems/congestionSystem";
import { DEFAULT_UNLOCK_STATE } from "../types/unlocks";

describe("Congestion System", () => {
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
      },
      taskRequests: [],
      grid: {
        width: 10,
        height: 10,
        walkCost: new Array(100).fill(1),
      },
    };
  });

  it("should increase congestion where drones are located", () => {
    // Add a drone at position 5,5
    world.position[1] = { x: 5, y: 5 };
    world.droneBrain[1] = {
      role: "hauler",
      state: "idle",
      cargo: { resource: null, amount: 0 },
      battery: 1,
      targetEntity: null,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 0,
      },
    };

    const idx = 5 * 10 + 5; // Grid index for position 5,5
    const initialCost = world.grid.walkCost[idx];

    // Run congestion system for 1 second
    congestionSystem(world, 1.0);

    expect(world.grid.walkCost[idx]).toBeGreaterThan(initialCost);
  });

  it("should decay congestion over time when no drones present", () => {
    const idx = 5 * 10 + 5;
    world.grid.walkCost[idx] = 3.0; // Set elevated congestion

    // Run congestion system without any drones for 1 second
    congestionSystem(world, 1.0);

    expect(world.grid.walkCost[idx]).toBeLessThan(3.0);
  });

  it("should cap maximum congestion", () => {
    // Add multiple drones at the same position
    for (let i = 1; i <= 10; i++) {
      world.position[i] = { x: 5, y: 5 };
      world.droneBrain[i] = {
        role: "hauler",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: false,
          buildRadius: 5,
          congestionAvoidance: 0,
        },
      };
    }

    const idx = 5 * 10 + 5;

    // Run congestion system for multiple seconds
    for (let i = 0; i < 20; i++) {
      congestionSystem(world, 1.0);
    }

    // Congestion should be capped (base=1 + max=5 = 6)
    expect(world.grid.walkCost[idx]).toBeLessThanOrEqual(6.0);
  });

  it("should not go below base walk cost", () => {
    const idx = 5 * 10 + 5;
    world.grid.walkCost[idx] = 1.5;

    // Run congestion system for many seconds without drones
    for (let i = 0; i < 10; i++) {
      congestionSystem(world, 1.0);
    }

    expect(world.grid.walkCost[idx]).toBe(1.0);
  });

  it("should handle drones at grid boundaries", () => {
    // Add drones at corners
    world.position[1] = { x: 0, y: 0 };
    world.position[2] = { x: 9, y: 9 };
    world.droneBrain[1] = {
      role: "hauler",
      state: "idle",
      cargo: { resource: null, amount: 0 },
      battery: 1,
      targetEntity: null,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 0,
      },
    };
    world.droneBrain[2] = { ...world.droneBrain[1] };

    // Should not throw errors
    expect(() => congestionSystem(world, 1.0)).not.toThrow();

    const idx1 = 0 * 10 + 0;
    const idx2 = 9 * 10 + 9;
    expect(world.grid.walkCost[idx1]).toBeGreaterThan(1.0);
    expect(world.grid.walkCost[idx2]).toBeGreaterThan(1.0);
  });

  it("should handle drones outside grid bounds gracefully", () => {
    // Add drone outside grid
    world.position[1] = { x: -1, y: 5 };
    world.droneBrain[1] = {
      role: "hauler",
      state: "idle",
      cargo: { resource: null, amount: 0 },
      battery: 1,
      targetEntity: null,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 0,
      },
    };

    // Should not throw errors or affect grid
    expect(() => congestionSystem(world, 1.0)).not.toThrow();
  });

  it("should handle fractional positions by rounding", () => {
    // Add drone at fractional position
    world.position[1] = { x: 5.7, y: 5.3 };
    world.droneBrain[1] = {
      role: "hauler",
      state: "idle",
      cargo: { resource: null, amount: 0 },
      battery: 1,
      targetEntity: null,
      behavior: {
        priorityRules: [],
        prefetchCriticalInputs: false,
        buildRadius: 5,
        congestionAvoidance: 0,
      },
    };

    congestionSystem(world, 1.0);

    // Should affect tile 6,5 (rounded)
    const idx = 5 * 10 + 6;
    expect(world.grid.walkCost[idx]).toBeGreaterThan(1.0);
  });
});
