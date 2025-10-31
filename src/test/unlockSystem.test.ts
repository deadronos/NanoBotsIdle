import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../ecs/world/World";
import { unlockSystem } from "../ecs/systems/unlockSystem";
import { DEFAULT_UNLOCK_STATE } from "../types/unlocks";
import { getDroneFabricationCost } from "../sim/balance";

describe("Unlock System", () => {
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
        swarmCognition: 0,
      },
      taskRequests: [],
      builderTargets: {},
      maintenanceRequests: [],
      maintainerTargets: {},
      flowFields: new Map(),
      grid: {
        width: 64,
        height: 64,
        walkCost: new Array(64 * 64).fill(1),
      },
    };
  });

  describe("Unlock Triggers", () => {
    it("should unlock ghost building when drone count reaches 3", () => {
      // Initially locked
      expect(world.globals.unlocks.ghostBuilding).toBe(false);

      // Add 2 drones - should not unlock yet
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
      world.droneBrain[2] = {
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

      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.ghostBuilding).toBe(false);

      // Add 3rd drone - should unlock
      world.droneBrain[3] = {
        role: "builder",
        state: "idle",
        cargo: { resource: null, amount: 0 },
        battery: 1,
        targetEntity: null,
        behavior: {
          priorityRules: [],
          prefetchCriticalInputs: false,
          buildRadius: 7,
          congestionAvoidance: 0,
        },
      };

      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.ghostBuilding).toBe(true);
    });

    it("should unlock routing priorities when drone count reaches 3", () => {
      expect(world.globals.unlocks.routingPriorities).toBe(false);

      // Add 3 drones
      for (let i = 1; i <= 3; i++) {
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

      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.routingPriorities).toBe(true);
    });

    it("should unlock power veins when building count reaches 6", () => {
      expect(world.globals.unlocks.powerVeins).toBe(false);

      // Add 5 buildings - should not unlock yet
      for (let i = 1; i <= 5; i++) {
        world.entityType[i] = "Extractor";
        world.position[i] = { x: i * 2, y: 32 };
      }

      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.powerVeins).toBe(false);

      // Add 6th building - should unlock
      world.entityType[6] = "Assembler";
      world.position[6] = { x: 12, y: 32 };

      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.powerVeins).toBe(true);
    });

    it("should unlock coolers after 13 minutes", () => {
      expect(world.globals.unlocks.coolers).toBe(false);

      // Before 13 minutes
      world.globals.simTimeSeconds = 12 * 60;
      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.coolers).toBe(false);

      // After 13 minutes
      world.globals.simTimeSeconds = 13 * 60;
      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.coolers).toBe(true);
    });

    it("should unlock fork process after 16 minutes", () => {
      expect(world.globals.unlocks.forkProcess).toBe(false);

      world.globals.simTimeSeconds = 16 * 60;
      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.forkProcess).toBe(true);
    });

    it("should unlock overclock mode after 25 minutes", () => {
      expect(world.globals.unlocks.overclockMode).toBe(false);

      world.globals.simTimeSeconds = 25 * 60;
      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.overclockMode).toBe(true);
    });

    it("should unlock self-termination when heat ratio exceeds 1.2", () => {
      expect(world.globals.unlocks.selfTermination).toBe(false);

      // Heat ratio at 1.0 - should not unlock
      world.globals.heatCurrent = 100;
      world.globals.heatSafeCap = 100;
      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.selfTermination).toBe(false);

      // Heat ratio at 1.3 - should unlock
      world.globals.heatCurrent = 130;
      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.selfTermination).toBe(true);
    });

    it("should not unlock features twice", () => {
      // Add 3 drones to trigger unlock
      for (let i = 1; i <= 3; i++) {
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

      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.ghostBuilding).toBe(true);

      // Run again - should remain unlocked
      unlockSystem(world, 0.1);
      expect(world.globals.unlocks.ghostBuilding).toBe(true);
    });
  });

  describe("Progression Milestones", () => {
    it("should achieve milestone at 2 minutes", () => {
      world.globals.milestones = [
        {
          id: "milestone_2min",
          name: "Bootstrap Phase",
          description: "Your first factory is operational",
          timeSeconds: 2 * 60,
          achieved: false,
          notified: false,
        },
      ];

      world.globals.simTimeSeconds = 2 * 60;
      unlockSystem(world, 0.1);
      expect(world.globals.milestones[0].achieved).toBe(true);
    });

    it("should not achieve milestone before time", () => {
      world.globals.milestones = [
        {
          id: "milestone_5min",
          name: "Swarm Expansion",
          description: "Multiple drones coordinate logistics",
          timeSeconds: 5 * 60,
          achieved: false,
          notified: false,
        },
      ];

      world.globals.simTimeSeconds = 4 * 60;
      unlockSystem(world, 0.1);
      expect(world.globals.milestones[0].achieved).toBe(false);
    });
  });

  describe("Drone Cost Scaling", () => {
    it("should use quadratic cost scaling for drones", () => {
      // Test the cost scaling matches the documented curve
      const cost1 = getDroneFabricationCost(1);
      const cost2 = getDroneFabricationCost(2);
      const cost3 = getDroneFabricationCost(3);
      const cost4 = getDroneFabricationCost(4);
      const cost5 = getDroneFabricationCost(5);

      // Verify costs increase quadratically
      expect(cost1.Components).toBeLessThan(cost2.Components!);
      expect(cost2.Components).toBeLessThan(cost3.Components!);
      expect(cost3.Components).toBeLessThan(cost4.Components!);
      expect(cost4.Components).toBeLessThan(cost5.Components!);

      // Check specific values match the formula
      // base * (a*n² + b*n + c) where base=3, a=0.4, b=0.5, c=1.0
      expect(cost1.Components).toBe(5);   // Drone 1: 5 Components
      expect(cost2.Components).toBe(10);  // Drone 2: 10 Components
      expect(cost3.Components).toBe(18);  // Drone 3: 18 Components
      expect(cost4.Components).toBe(28);  // Drone 4: 28 Components
      expect(cost5.Components).toBe(40);  // Drone 5: 40 Components

      // Verify progression allows 3-5 drones in 15 minutes
      // Assuming ~100 Components producible in 15 min (rough estimate)
      const totalFor3Drones = cost1.Components! + cost2.Components! + cost3.Components!;
      const totalFor5Drones = totalFor3Drones + cost4.Components! + cost5.Components!;
      
      expect(totalFor3Drones).toBeLessThanOrEqual(50); // 3 drones should be easy
      expect(totalFor5Drones).toBeLessThanOrEqual(110); // 5 drones should be achievable
    });
  });
});
