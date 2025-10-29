import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../ecs/world/World";
import { demandPlanningSystem } from "../ecs/systems/demandPlanningSystem";
import { droneAssignmentSystem } from "../ecs/systems/droneAssignmentSystem";
import { recycleEntity } from "../ecs/systems/recyclingSystem";
import { DEFAULT_UNLOCK_STATE } from "../types/unlocks";
import { Recipe } from "../types/buildings";

describe("Advanced Drone Behaviors", () => {
  let world: World;
  let coreId: number;
  let fabricatorId: number;
  let assemblerId: number;
  let extractorId: number;

  const TEST_RECIPE: Recipe = {
    inputs: { Carbon: 2 },
    outputs: { Components: 1 },
    batchTimeSeconds: 2,
  };

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
      recyclable: {},
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
      builderTargets: {},
      grid: {
        width: 64,
        height: 64,
        walkCost: new Array(64 * 64).fill(1),
      },
    };

    // Create Core with resources
    coreId = world.nextEntityId++;
    world.entityType[coreId] = "Core";
    world.position[coreId] = { x: 32, y: 32 };
    world.inventory[coreId] = {
      capacity: 999,
      contents: { Carbon: 100, Components: 50 },
    };
    world.powerLink[coreId] = { demand: 1, priority: 0, online: true, connectedToGrid: true };

    // Create Fabricator
    fabricatorId = world.nextEntityId++;
    world.entityType[fabricatorId] = "Fabricator";
    world.position[fabricatorId] = { x: 30, y: 32 };
    world.inventory[fabricatorId] = {
      capacity: 50,
      contents: { Components: 5 },
    };
    world.producer[fabricatorId] = {
      recipe: { inputs: { Components: 3 }, outputs: { DroneFrame: 1 }, batchTimeSeconds: 5 },
      progress: 0,
      baseRate: 0.25,
      tier: 1,
      active: true,
    };
    world.powerLink[fabricatorId] = { demand: 2, priority: 1, online: true, connectedToGrid: true };

    // Create Assembler
    assemblerId = world.nextEntityId++;
    world.entityType[assemblerId] = "Assembler";
    world.position[assemblerId] = { x: 32, y: 34 };
    world.inventory[assemblerId] = {
      capacity: 50,
      contents: { Carbon: 3 },
    };
    world.producer[assemblerId] = {
      recipe: TEST_RECIPE,
      progress: 0,
      baseRate: 0.5,
      tier: 1,
      active: true,
    };
    world.powerLink[assemblerId] = { demand: 2, priority: 2, online: true, connectedToGrid: true };

    // Create Extractor
    extractorId = world.nextEntityId++;
    world.entityType[extractorId] = "Extractor";
    world.position[extractorId] = { x: 34, y: 32 };
    world.inventory[extractorId] = {
      capacity: 50,
      contents: { Carbon: 0 },
    };
    world.producer[extractorId] = {
      recipe: { inputs: {}, outputs: { Carbon: 1 }, batchTimeSeconds: 1 },
      progress: 0,
      baseRate: 1,
      tier: 1,
      active: true,
    };
    world.powerLink[extractorId] = { demand: 1, priority: 1, online: true, connectedToGrid: true };
  });

  describe("Prefetch/Low-Water-Mark Hauling", () => {
    it("should create tasks when inventory is below 30% with prefetch enabled", () => {
      // Create drone with prefetch enabled
      const droneId = world.nextEntityId++;
      world.entityType[droneId] = "Drone";
      world.position[droneId] = { x: 32, y: 32 };
      world.droneBrain[droneId] = {
        role: "hauler",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: true,
          buildRadius: 5,
          congestionAvoidance: 1,
        },
      };

      // Run demand planning
      demandPlanningSystem(world, 0.1);

      // Should create task requests for low inventory buildings
      expect(world.taskRequests.length).toBeGreaterThan(0);

      // Verify tasks are sorted by priority
      for (let i = 1; i < world.taskRequests.length; i++) {
        expect(world.taskRequests[i - 1].priorityScore).toBeGreaterThanOrEqual(
          world.taskRequests[i].priorityScore
        );
      }
    });

    it("should not create tasks when inventory is above low-water mark", () => {
      // Fill inventories
      world.inventory[fabricatorId].contents.Components = 50;
      world.inventory[assemblerId].contents.Carbon = 50;

      // Create drone with prefetch enabled
      const droneId = world.nextEntityId++;
      world.droneBrain[droneId] = {
        role: "hauler",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: true,
          buildRadius: 5,
          congestionAvoidance: 1,
        },
      };

      demandPlanningSystem(world, 0.1);

      // No tasks should be created when inventory is high
      expect(world.taskRequests.length).toBe(0);
    });
  });

  describe("Heat-Critical Routing Override", () => {
    it("should boost cooler priority when heat is critical", () => {
      // Create Cooler
      const coolerId = world.nextEntityId++;
      world.entityType[coolerId] = "Cooler";
      world.position[coolerId] = { x: 33, y: 32 };
      world.inventory[coolerId] = {
        capacity: 50,
        contents: { Components: 1 }, // Low components for cooling
      };
      world.producer[coolerId] = {
        recipe: { inputs: { Components: 2 }, outputs: {}, batchTimeSeconds: 3 },
        progress: 0,
        baseRate: 1,
        tier: 1,
        active: true,
      };
      world.powerLink[coolerId] = { demand: 1, priority: 1, online: true, connectedToGrid: true };

      // Set heat to critical level (> 90% of safe cap)
      world.globals.heatCurrent = 95;
      world.globals.heatSafeCap = 100;

      demandPlanningSystem(world, 0.1);

      // Find cooler task
      const coolerTask = world.taskRequests.find((t) => t.requestEntity === coolerId);
      expect(coolerTask).toBeDefined();
      expect(coolerTask!.priorityScore).toBe(1000); // High priority override
    });

    it("should use normal priority when heat is not critical", () => {
      // Create Cooler
      const coolerId = world.nextEntityId++;
      world.entityType[coolerId] = "Cooler";
      world.position[coolerId] = { x: 33, y: 32 };
      world.inventory[coolerId] = {
        capacity: 50,
        contents: { Components: 1 },
      };
      world.producer[coolerId] = {
        recipe: { inputs: { Components: 2 }, outputs: {}, batchTimeSeconds: 3 },
        progress: 0,
        baseRate: 1,
        tier: 1,
        active: true,
      };

      // Heat is not critical (< 90%)
      world.globals.heatCurrent = 50;
      world.globals.heatSafeCap = 100;

      demandPlanningSystem(world, 0.1);

      const coolerTask = world.taskRequests.find((t) => t.requestEntity === coolerId);
      if (coolerTask) {
        expect(coolerTask.priorityScore).toBeLessThan(1000);
      }
    });
  });

  describe("Overclock Priority Surge", () => {
    it("should prioritize Fabricator and CoreCompiler during overclock", () => {
      // Enable overclock
      world.globals.overclockEnabled = true;

      demandPlanningSystem(world, 0.1);

      // Find Fabricator task
      const fabTask = world.taskRequests.find((t) => t.requestEntity === fabricatorId);
      expect(fabTask).toBeDefined();
      expect(fabTask!.priorityScore).toBe(100); // High priority during overclock
    });

    it("should penalize non-critical buildings during overclock", () => {
      // Enable overclock
      world.globals.overclockEnabled = true;

      demandPlanningSystem(world, 0.1);

      // Find Assembler task (non-critical during overclock)
      const assemblerTask = world.taskRequests.find((t) => t.requestEntity === assemblerId);
      if (assemblerTask) {
        expect(assemblerTask.priorityScore).toBe(0.01); // Low priority penalty
      }
    });

    it("should use normal priorities when not overclocking", () => {
      // Overclock disabled
      world.globals.overclockEnabled = false;

      demandPlanningSystem(world, 0.1);

      // All tasks should have normal priority (1)
      world.taskRequests.forEach((task) => {
        expect(task.priorityScore).toBe(1);
      });
    });
  });

  describe("Builder Coordination", () => {
    it("should avoid duplicate targets when coordination is enabled", () => {
      // Create two builder drones with coordination enabled
      const builder1 = world.nextEntityId++;
      world.entityType[builder1] = "Drone";
      world.position[builder1] = { x: 32, y: 32 };
      world.droneBrain[builder1] = {
        role: "builder",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: false,
          buildRadius: 5,
          congestionAvoidance: 1,
          avoidDuplicateGhostTargets: true,
        },
      };

      const builder2 = world.nextEntityId++;
      world.entityType[builder2] = "Drone";
      world.position[builder2] = { x: 32, y: 32 };
      world.droneBrain[builder2] = {
        role: "builder",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: false,
          buildRadius: 5,
          congestionAvoidance: 1,
          avoidDuplicateGhostTargets: true,
        },
      };

      // Create an inactive building (ghost)
      const ghostId = world.nextEntityId++;
      world.entityType[ghostId] = "Ghost";
      world.position[ghostId] = { x: 35, y: 32 };
      world.producer[ghostId] = {
        recipe: TEST_RECIPE,
        progress: 0,
        baseRate: 1,
        tier: 1,
        active: false, // Inactive = needs building
      };

      // Run assignment system
      droneAssignmentSystem(world, 0.1);

      // Only one builder should target the ghost
      const builder1Target = world.droneBrain[builder1].targetEntity;
      const builder2Target = world.droneBrain[builder2].targetEntity;

      if (builder1Target !== null && builder2Target !== null) {
        expect(builder1Target).not.toBe(builder2Target);
      }

      // Check builderTargets tracking
      if (builder1Target === ghostId) {
        expect(world.builderTargets[ghostId]).toBe(builder1);
      } else if (builder2Target === ghostId) {
        expect(world.builderTargets[ghostId]).toBe(builder2);
      }
    });

    it("should allow multiple builders on same target when coordination disabled", () => {
      // Create two builder drones WITHOUT coordination
      const builder1 = world.nextEntityId++;
      world.droneBrain[builder1] = {
        role: "builder",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: false,
          buildRadius: 5,
          congestionAvoidance: 1,
          avoidDuplicateGhostTargets: false, // Disabled
        },
      };

      const builder2 = world.nextEntityId++;
      world.droneBrain[builder2] = {
        role: "builder",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: false,
          buildRadius: 5,
          congestionAvoidance: 1,
          avoidDuplicateGhostTargets: false, // Disabled
        },
      };

      // Create an inactive building
      const ghostId = world.nextEntityId++;
      world.entityType[ghostId] = "Ghost";
      world.position[ghostId] = { x: 35, y: 32 };
      world.producer[ghostId] = {
        recipe: TEST_RECIPE,
        progress: 0,
        baseRate: 1,
        tier: 1,
        active: false,
      };

      droneAssignmentSystem(world, 0.1);

      // builderTargets should be empty (no tracking)
      expect(Object.keys(world.builderTargets).length).toBe(0);
    });
  });

  describe("Recycling/Refund Mechanics", () => {
    it("should refund resources to Fabricator when recycling", () => {
      // Make extractor recyclable
      world.recyclable![extractorId] = {
        refundFraction: 0.5,
        refundToFabricator: true,
        buildCost: { Components: 10, TissueMass: 5 },
      };

      const initialComponents = world.inventory[fabricatorId].contents.Components || 0;

      // Recycle the extractor
      const refund = recycleEntity(world, extractorId);

      expect(refund).toBeDefined();
      expect(refund!.Components).toBe(5); // 50% of 10
      expect(refund!.TissueMass).toBe(2); // 50% of 5 (rounded down)

      // Verify resources added to Fabricator
      const finalComponents = world.inventory[fabricatorId].contents.Components || 0;
      expect(finalComponents).toBe(initialComponents + 5);
    });

    it("should refund resources to Core when not targeting Fabricator", () => {
      // Make assembler recyclable
      world.recyclable![assemblerId] = {
        refundFraction: 0.5,
        refundToFabricator: false, // Refund to Core
        buildCost: { Components: 20 },
      };

      const initialComponents = world.inventory[coreId].contents.Components || 0;

      // Recycle the assembler
      const refund = recycleEntity(world, assemblerId);

      expect(refund).toBeDefined();
      expect(refund!.Components).toBe(10); // 50% of 20

      // Verify resources added to Core
      const finalComponents = world.inventory[coreId].contents.Components || 0;
      expect(finalComponents).toBe(initialComponents + 10);
    });

    it("should remove entity components after recycling", () => {
      world.recyclable![extractorId] = {
        refundFraction: 0.5,
        refundToFabricator: true,
        buildCost: { Components: 10 },
      };

      recycleEntity(world, extractorId);

      // Verify entity is removed
      expect(world.position[extractorId]).toBeUndefined();
      expect(world.inventory[extractorId]).toBeUndefined();
      expect(world.producer[extractorId]).toBeUndefined();
      expect(world.entityType[extractorId]).toBeUndefined();
    });

    it("should return null when recycling non-recyclable entity", () => {
      // Try to recycle entity without recyclable component
      const refund = recycleEntity(world, assemblerId);

      expect(refund).toBeNull();
      // Entity should still exist
      expect(world.entityType[assemblerId]).toBe("Assembler");
    });
  });
});
