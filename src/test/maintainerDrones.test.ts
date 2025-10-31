import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../ecs/world/World";
import { degradationSystem, getDegradationEfficiencyMultiplier } from "../ecs/systems/degradationSystem";
import { maintenancePlanningSystem } from "../ecs/systems/maintenancePlanningSystem";
import { droneAssignmentSystem } from "../ecs/systems/droneAssignmentSystem";
import { movementSystem } from "../ecs/systems/movementSystem";
import { productionSystem } from "../ecs/systems/productionSystem";
import { DEFAULT_UNLOCK_STATE } from "../types/unlocks";
import { Recipe } from "../types/buildings";

describe("Maintainer Drones", () => {
  let world: World;
  let extractorId: number;
  let maintainerDroneId: number;

  const TEST_RECIPE: Recipe = {
    inputs: {},
    outputs: { Carbon: 1 },
    batchTimeSeconds: 1,
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
        swarmCognition: 0,
      },
      taskRequests: [],
      maintenanceRequests: [],
      builderTargets: {},
      maintainerTargets: {},
      flowFields: new Map(),
      grid: {
        width: 64,
        height: 64,
        walkCost: new Array(64 * 64).fill(1),
      },
    };

    // Create Extractor with degradation
    extractorId = world.nextEntityId++;
    world.entityType[extractorId] = "Extractor";
    world.position[extractorId] = { x: 34, y: 32 };
    world.inventory[extractorId] = { capacity: 50, contents: {} };
    world.producer[extractorId] = {
      recipe: TEST_RECIPE,
      progress: 0,
      baseRate: 1,
      tier: 1,
      active: true,
    };
    world.degradable[extractorId] = {
      wear: 0,
      wearRate: 0.001, // Fast degradation for testing
      maintenanceTime: 5,
      maxEfficiencyPenalty: 0.3,
    };
    world.powerLink[extractorId] = { demand: 1, priority: 1, online: true, connectedToGrid: true };

    // Create Maintainer Drone
    maintainerDroneId = world.nextEntityId++;
    world.entityType[maintainerDroneId] = "Drone";
    world.position[maintainerDroneId] = { x: 32, y: 32 };
    world.inventory[maintainerDroneId] = { capacity: 5, contents: {} };
    world.droneBrain[maintainerDroneId] = {
      role: "maintainer",
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
    world.powerLink[maintainerDroneId] = { demand: 0.1, priority: 0, online: true, connectedToGrid: true };
  });

  describe("Degradation System", () => {
    it("should accumulate wear on active buildings over time", () => {
      expect(world.degradable[extractorId].wear).toBe(0);

      // Simulate 100 seconds
      for (let i = 0; i < 100; i++) {
        degradationSystem(world, 1);
      }

      // With wearRate = 0.001/sec and 100 seconds, wear should be 0.1
      expect(world.degradable[extractorId].wear).toBeGreaterThan(0.09);
      expect(world.degradable[extractorId].wear).toBeLessThan(0.11);
    });

    it("should not accumulate wear on inactive buildings", () => {
      world.producer[extractorId].active = false;

      degradationSystem(world, 10);

      expect(world.degradable[extractorId].wear).toBe(0);
    });

    it("should increase wear rate with high heat", () => {
      // Set heat to 90% (critical)
      world.globals.heatCurrent = 90;
      world.globals.heatSafeCap = 100;

      degradationSystem(world, 10);
      const wearWithHeat = world.degradable[extractorId].wear;

      // Reset and test without heat
      world.degradable[extractorId].wear = 0;
      world.globals.heatCurrent = 0;

      degradationSystem(world, 10);
      const wearWithoutHeat = world.degradable[extractorId].wear;

      expect(wearWithHeat).toBeGreaterThan(wearWithoutHeat);
    });

    it("should double wear rate when overclocked", () => {
      world.overclockable[extractorId] = {
        safeRateMult: 1.0,
        overRateMult: 2.0,
        heatMultiplier: 3.0,
      };

      // Measure wear without overclock
      degradationSystem(world, 10);
      const wearNormal = world.degradable[extractorId].wear;

      // Reset and measure with overclock
      world.degradable[extractorId].wear = 0;
      world.globals.overclockEnabled = true;

      degradationSystem(world, 10);
      const wearOverclock = world.degradable[extractorId].wear;

      expect(wearOverclock).toBeGreaterThan(wearNormal * 1.9); // Should be ~2x
    });

    it("should cap wear at 1.0", () => {
      // Run for a very long time
      for (let i = 0; i < 2000; i++) {
        degradationSystem(world, 1);
      }

      expect(world.degradable[extractorId].wear).toBeLessThanOrEqual(1.0);
    });

    it("should reduce production efficiency based on wear", () => {
      // No wear = 100% efficiency
      world.degradable[extractorId].wear = 0;
      expect(getDegradationEfficiencyMultiplier(world, extractorId)).toBe(1.0);

      // 50% wear with 30% max penalty = 85% efficiency
      world.degradable[extractorId].wear = 0.5;
      expect(getDegradationEfficiencyMultiplier(world, extractorId)).toBeCloseTo(0.85);

      // 100% wear with 30% max penalty = 70% efficiency
      world.degradable[extractorId].wear = 1.0;
      expect(getDegradationEfficiencyMultiplier(world, extractorId)).toBeCloseTo(0.7);
    });
  });

  describe("Maintenance Planning System", () => {
    it("should create maintenance requests for buildings above threshold", () => {
      // Set wear above threshold (30%)
      world.degradable[extractorId].wear = 0.4;

      maintenancePlanningSystem(world, 0);

      expect(world.maintenanceRequests.length).toBe(1);
      expect(world.maintenanceRequests[0].targetEntity).toBe(extractorId);
    });

    it("should not create maintenance requests for buildings below threshold", () => {
      // Set wear below threshold (30%)
      world.degradable[extractorId].wear = 0.2;

      maintenancePlanningSystem(world, 0);

      expect(world.maintenanceRequests.length).toBe(0);
    });

    it("should prioritize critical buildings higher", () => {
      // Create Fabricator (critical)
      const fabId = world.nextEntityId++;
      world.entityType[fabId] = "Fabricator";
      world.position[fabId] = { x: 30, y: 32 };
      world.degradable[fabId] = {
        wear: 0.4,
        wearRate: 0.001,
        maintenanceTime: 5,
        maxEfficiencyPenalty: 0.3,
      };
      world.producer[fabId] = {
        recipe: TEST_RECIPE,
        progress: 0,
        baseRate: 0.5,
        tier: 1,
        active: true,
      };

      // Both buildings need maintenance
      world.degradable[extractorId].wear = 0.4;

      maintenancePlanningSystem(world, 0);

      // Fabricator should be first (higher priority)
      expect(world.maintenanceRequests[0].targetEntity).toBe(fabId);
      expect(world.maintenanceRequests[0].priorityScore).toBeGreaterThan(
        world.maintenanceRequests[1].priorityScore
      );
    });

    it("should not create duplicate requests for same building", () => {
      world.degradable[extractorId].wear = 0.4;

      maintenancePlanningSystem(world, 0);
      expect(world.maintenanceRequests.length).toBe(1);

      // Run again - should not create duplicate
      maintenancePlanningSystem(world, 0);
      expect(world.maintenanceRequests.length).toBe(1);
    });

    it("should not request maintenance if maintainer already assigned", () => {
      world.degradable[extractorId].wear = 0.4;
      world.maintainerTargets[extractorId] = maintainerDroneId; // Already being maintained

      maintenancePlanningSystem(world, 0);

      expect(world.maintenanceRequests.length).toBe(0);
    });
  });

  describe("Maintainer Drone Assignment", () => {
    it("should assign idle maintainer to maintenance request", () => {
      world.degradable[extractorId].wear = 0.4;

      // Create maintenance request
      world.maintenanceRequests.push({
        targetEntity: extractorId,
        priorityScore: 1.0,
        createdAt: 0,
      });

      droneAssignmentSystem(world, 0);

      const brain = world.droneBrain[maintainerDroneId];
      expect(brain.state).toBe("maintaining");
      expect(brain.targetEntity).toBe(extractorId);
      expect(world.maintainerTargets[extractorId]).toBe(maintainerDroneId);
      expect(world.maintenanceRequests.length).toBe(0); // Request consumed
    });

    it("should not assign multiple maintainers to same building", () => {
      // Create second maintainer
      const maintainer2Id = world.nextEntityId++;
      world.entityType[maintainer2Id] = "Drone";
      world.position[maintainer2Id] = { x: 32, y: 32 };
      world.inventory[maintainer2Id] = { capacity: 5, contents: {} };
      world.droneBrain[maintainer2Id] = {
        role: "maintainer",
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

      world.degradable[extractorId].wear = 0.4;
      world.maintenanceRequests.push({
        targetEntity: extractorId,
        priorityScore: 1.0,
        createdAt: 0,
      });

      droneAssignmentSystem(world, 0);

      // One maintainer assigned
      const assignedCount = Object.values(world.droneBrain).filter(
        (b) => b.role === "maintainer" && b.state === "maintaining"
      ).length;

      expect(assignedCount).toBe(1);
    });
  });

  describe("Maintenance Work", () => {
    it("should perform maintenance and reduce wear when at target", () => {
      world.degradable[extractorId].wear = 0.6; // 60% wear

      // Set maintainer to maintaining state at target location
      const brain = world.droneBrain[maintainerDroneId];
      brain.state = "maintaining";
      brain.targetEntity = extractorId;
      world.position[maintainerDroneId] = { x: 34, y: 32 }; // At extractor position

      // Simulate maintenance work (5 seconds required)
      for (let i = 0; i < 5; i++) {
        movementSystem(world, 1);
      }

      // Maintenance should be complete, wear reduced by 60%
      expect(world.degradable[extractorId].wear).toBeLessThan(0.1);
      expect(brain.state).toBe("idle");
      expect(brain.targetEntity).toBeNull();
    });

    it("should not perform maintenance when too far from target", () => {
      world.degradable[extractorId].wear = 0.6;

      const brain = world.droneBrain[maintainerDroneId];
      brain.state = "maintaining";
      brain.targetEntity = extractorId;
      world.position[maintainerDroneId] = { x: 30, y: 30 }; // Far from extractor

      // Simulate - should not make progress
      movementSystem(world, 1);

      expect(world.degradable[extractorId].wear).toBe(0.6); // No change
    });

    it("should clean up maintainer target when going idle", () => {
      world.maintainerTargets[extractorId] = maintainerDroneId;
      
      const brain = world.droneBrain[maintainerDroneId];
      brain.role = "maintainer";
      brain.state = "idle";
      brain.targetEntity = extractorId;

      // Ensure no maintenance requests to assign
      world.maintenanceRequests = [];

      droneAssignmentSystem(world, 0);

      expect(world.maintainerTargets[extractorId]).toBeUndefined();
      expect(brain.targetEntity).toBeNull();
    });
  });

  describe("Integration with Production", () => {
    it("should affect production rate through degradation penalty", () => {
      // Test the degradation multiplier directly
      
      // With no wear, efficiency should be 100%
      world.degradable[extractorId].wear = 0;
      const efficiencyNoDegradation = getDegradationEfficiencyMultiplier(world, extractorId);
      expect(efficiencyNoDegradation).toBe(1.0);

      // With maximum wear, efficiency should be 70% (30% penalty)
      world.degradable[extractorId].wear = 1.0;
      const efficiencyMaxDegradation = getDegradationEfficiencyMultiplier(world, extractorId);
      expect(efficiencyMaxDegradation).toBeCloseTo(0.7);

      // The degradation penalty directly affects production rate in productionSystem.ts
      // effectiveRate = outputRate * rateMult * degradationMult
      // So with 1.0 wear and 0.3 maxEfficiencyPenalty, production is 70% of normal
    });
  });

  describe("End-to-End Maintenance Cycle", () => {
    it("should complete full maintenance cycle from degradation to repair", () => {
      // 1. Building degrades over time
      for (let i = 0; i < 400; i++) {
        degradationSystem(world, 1);
      }

      expect(world.degradable[extractorId].wear).toBeGreaterThan(0.3);
      const initialWear = world.degradable[extractorId].wear;

      // 2. Maintenance request is created
      maintenancePlanningSystem(world, 0);
      expect(world.maintenanceRequests.length).toBe(1);

      // 3. Maintainer drone is assigned
      droneAssignmentSystem(world, 0);
      expect(world.droneBrain[maintainerDroneId].state).toBe("maintaining");
      expect(world.maintenanceRequests.length).toBe(0);

      // 4. Maintainer moves to target and performs maintenance
      world.position[maintainerDroneId] = { x: 34, y: 32 }; // At target

      for (let i = 0; i < 6; i++) {
        movementSystem(world, 1);
      }

      // 5. Maintenance complete, wear significantly reduced
      expect(world.degradable[extractorId].wear).toBeLessThan(initialWear);
      expect(world.droneBrain[maintainerDroneId].state).toBe("idle");
    });
  });
});
