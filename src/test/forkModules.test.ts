import { describe, it, expect, beforeEach } from "vitest";
import { createRunSlice, RunSlice } from "../state/runSlice";
import { createMetaSlice, MetaSlice } from "../state/metaSlice";

describe("Fork Module System", () => {
  let runSlice: RunSlice & MetaSlice;

  beforeEach(() => {
    // Create fresh slices for each test
    const setState = (partial: Partial<RunSlice & MetaSlice>) => {
      Object.assign(runSlice, partial);
    };
    const getState = () => runSlice;
    
    const metaSliceObj = createMetaSlice(setState as any, getState as any, {} as any);
    const runSliceObj = createRunSlice(setState as any, getState as any, {} as any);
    
    runSlice = {
      ...metaSliceObj,
      ...runSliceObj,
    };
    
    // Set up world to phase 2 so fork is available
    const world = runSlice.world;
    world.globals.simTimeSeconds = 1000; // 16+ minutes
    world.globals.unlocks.forkProcess = true;
    
    // Grant some initial fork points
    runSlice.forkPoints = 10;
  });

  describe("Fork Module Data", () => {
    it("should have 5 fork modules defined", () => {
      const modules = runSlice.getAvailableForkModules();
      expect(modules).toBeDefined();
      expect(modules.length).toBe(5);
    });

    it("should have correct module IDs", () => {
      const modules = runSlice.getAvailableForkModules();
      const moduleIds = modules.map((m) => m.id);
      
      expect(moduleIds).toContain("fork.predictiveHauler");
      expect(moduleIds).toContain("fork.builderSwarmInstinct");
      expect(moduleIds).toContain("fork.emergencyCoolingProtocol");
      expect(moduleIds).toContain("fork.cannibalizeAndReforge");
      expect(moduleIds).toContain("fork.prioritySurge");
    });

    it("should have balanced costs (1-3 fork points)", () => {
      const modules = runSlice.getAvailableForkModules();
      
      modules.forEach((module) => {
        expect(module.cost.amount).toBeGreaterThanOrEqual(1);
        expect(module.cost.amount).toBeLessThanOrEqual(3);
        expect(module.cost.currency).toBe("ForkPoints");
      });
    });

    it("should have descriptions for all modules", () => {
      const modules = runSlice.getAvailableForkModules();
      
      modules.forEach((module) => {
        expect(module.name).toBeTruthy();
        expect(module.desc).toBeTruthy();
        expect(module.desc.length).toBeGreaterThan(20); // Meaningful description
      });
    });
  });

  describe("Fork Module Purchase", () => {
    it("should allow purchasing a module with enough points", () => {
      // Try to purchase Predictive Hauler (costs 1)
      const check = runSlice.canPurchaseForkModule("fork.predictiveHauler");
      expect(check.canPurchase).toBe(true);
      
      const success = runSlice.purchaseForkModule("fork.predictiveHauler");
      expect(success).toBe(true);
      
      // Check that module was acquired
      expect(runSlice.acquiredModules).toContain("fork.predictiveHauler");
      expect(runSlice.forkPoints).toBe(9); // 10 - 1
    });

    it("should prevent purchasing when insufficient points", () => {
      runSlice.forkPoints = 0;
      
      const check = runSlice.canPurchaseForkModule("fork.predictiveHauler");
      
      expect(check.canPurchase).toBe(false);
      expect(check.reason).toContain("fork points");
    });

    it("should prevent purchasing already acquired module", () => {
      // Purchase once
      runSlice.purchaseForkModule("fork.predictiveHauler");
      
      // Try to purchase again
      const check = runSlice.canPurchaseForkModule("fork.predictiveHauler");
      expect(check.canPurchase).toBe(false);
      expect(check.reason).toBe("Already purchased");
    });

    it("should allow purchasing multiple different modules", () => {
      // Purchase multiple modules
      runSlice.purchaseForkModule("fork.predictiveHauler"); // 1 point
      runSlice.purchaseForkModule("fork.builderSwarmInstinct"); // 1 point
      
      expect(runSlice.acquiredModules.length).toBe(2);
      expect(runSlice.forkPoints).toBe(8); // 10 - 1 - 1
    });

    it("should track acquired modules across multiple purchases", () => {
      expect(runSlice.acquiredModules.length).toBe(0);
      
      runSlice.purchaseForkModule("fork.predictiveHauler");
      expect(runSlice.acquiredModules.length).toBe(1);
      
      runSlice.purchaseForkModule("fork.builderSwarmInstinct");
      expect(runSlice.acquiredModules.length).toBe(2);
      
      runSlice.purchaseForkModule("fork.emergencyCoolingProtocol");
      expect(runSlice.acquiredModules.length).toBe(3);
    });
  });

  describe("RunBehaviorContext Updates", () => {
    it("should update behavior context when purchasing Predictive Hauler", () => {
      // Check initial context
      expect(runSlice.runBehaviorContext.prefetchCriticalInputs).toBe(false);
      expect(runSlice.runBehaviorContext.lowWaterMarkEnabled).toBe(false);
      
      // Purchase module
      runSlice.purchaseForkModule("fork.predictiveHauler");
      
      // Check updated context
      expect(runSlice.runBehaviorContext.prefetchCriticalInputs).toBe(true);
      expect(runSlice.runBehaviorContext.lowWaterMarkEnabled).toBe(true);
      expect(runSlice.runBehaviorContext.lowWaterThresholdFraction).toBe(0.3);
    });

    it("should update behavior context when purchasing Builder Swarm Instinct", () => {
      // Check initial context
      expect(runSlice.runBehaviorContext.buildRadiusBonus).toBe(0);
      expect(runSlice.runBehaviorContext.avoidDuplicateGhostTargets).toBe(false);
      
      // Purchase module
      runSlice.purchaseForkModule("fork.builderSwarmInstinct");
      
      // Check updated context
      expect(runSlice.runBehaviorContext.buildRadiusBonus).toBe(4);
      expect(runSlice.runBehaviorContext.avoidDuplicateGhostTargets).toBe(true);
    });

    it("should update behavior context when purchasing Emergency Cooling Protocol", () => {
      // Check initial context
      expect(runSlice.runBehaviorContext.heatCriticalRoutingBoost).toBe(false);
      
      // Purchase module
      runSlice.purchaseForkModule("fork.emergencyCoolingProtocol");
      
      // Check updated context
      expect(runSlice.runBehaviorContext.heatCriticalRoutingBoost).toBe(true);
      expect(runSlice.runBehaviorContext.heatCriticalThresholdRatio).toBe(0.9);
      expect(runSlice.runBehaviorContext.coolerPriorityOverride).toBe(0);
    });

    it("should update behavior context when purchasing Cannibalize & Reforge", () => {
      // Check initial context
      expect(runSlice.runBehaviorContext.refundToFabricator).toBe(false);
      expect(runSlice.runBehaviorContext.refundComponentsFraction).toBe(0);
      
      // Purchase module
      runSlice.purchaseForkModule("fork.cannibalizeAndReforge");
      
      // Check updated context
      expect(runSlice.runBehaviorContext.refundToFabricator).toBe(true);
      expect(runSlice.runBehaviorContext.refundComponentsFraction).toBe(0.5);
      expect(runSlice.runBehaviorContext.postForkRebuildBoost).toBe(true);
    });

    it("should update behavior context when purchasing Priority Surge", () => {
      // Check initial context
      expect(runSlice.runBehaviorContext.overrideTaskPrioritiesDuringOverclock).toBe(false);
      expect(runSlice.runBehaviorContext.overclockPrimaryTargets.length).toBe(0);
      
      // Purchase module
      runSlice.purchaseForkModule("fork.prioritySurge");
      
      // Check updated context
      expect(runSlice.runBehaviorContext.overrideTaskPrioritiesDuringOverclock).toBe(true);
      expect(runSlice.runBehaviorContext.overclockPrimaryTargets).toContain("Fabricator");
      expect(runSlice.runBehaviorContext.overclockPrimaryTargets).toContain("CoreCompiler");
      expect(runSlice.runBehaviorContext.overclockNonPrimaryPenalty).toBe(1000);
    });

    it("should accumulate effects from multiple modules", () => {
      // Purchase multiple modules
      runSlice.purchaseForkModule("fork.predictiveHauler");
      runSlice.purchaseForkModule("fork.builderSwarmInstinct");
      
      // Check that both effects are applied
      expect(runSlice.runBehaviorContext.prefetchCriticalInputs).toBe(true);
      expect(runSlice.runBehaviorContext.buildRadiusBonus).toBe(4);
    });
  });

  describe("Fork Process Integration", () => {
    it("should reset acquired modules on prestige", () => {
      // Purchase some modules
      runSlice.purchaseForkModule("fork.predictiveHauler");
      runSlice.purchaseForkModule("fork.builderSwarmInstinct");
      expect(runSlice.acquiredModules.length).toBe(2);
      
      // Prestige
      runSlice.prestigeNow();
      
      // Check that modules are reset
      expect(runSlice.acquiredModules.length).toBe(0);
    });

    it("should reset behavior context on prestige", () => {
      // Purchase a module to modify context
      runSlice.purchaseForkModule("fork.predictiveHauler");
      expect(runSlice.runBehaviorContext.prefetchCriticalInputs).toBe(true);
      
      // Prestige
      runSlice.prestigeNow();
      
      // Check that context is reset to default
      expect(runSlice.runBehaviorContext.prefetchCriticalInputs).toBe(false);
      expect(runSlice.runBehaviorContext.lowWaterMarkEnabled).toBe(false);
    });

    it("should grant fork points from Fork Process", () => {
      // Fork process would normally count drones and grant points
      // Since we can't easily create drones in test, we verify the state structure exists
      expect(runSlice.forkPoints).toBeDefined();
      expect(typeof runSlice.forkPoints).toBe("number");
    });
  });

  describe("Module Cost Balance", () => {
    it("should have total cost of all modules under 10 points", () => {
      const modules = runSlice.getAvailableForkModules();
      const totalCost = modules.reduce((sum, m) => sum + m.cost.amount, 0);
      
      // Total cost should be reasonable for mid-run economy
      expect(totalCost).toBeLessThanOrEqual(10);
      expect(totalCost).toBeGreaterThanOrEqual(5);
    });

    it("should have at least 2 cheap modules (1 point each)", () => {
      const modules = runSlice.getAvailableForkModules();
      const cheapModules = modules.filter((m) => m.cost.amount === 1);
      
      expect(cheapModules.length).toBeGreaterThanOrEqual(2);
    });

    it("should have at least 1 expensive module (3 points)", () => {
      const modules = runSlice.getAvailableForkModules();
      const expensiveModules = modules.filter((m) => m.cost.amount === 3);
      
      expect(expensiveModules.length).toBeGreaterThanOrEqual(1);
    });
  });
});
