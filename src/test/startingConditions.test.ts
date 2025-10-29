import { describe, it, expect } from "vitest";
import { createWorld } from "../ecs/world/createWorld";
import {
  SwarmCognitionUpgrades,
  BioStructureUpgrades,
  CompilerOptimizationUpgrades,
} from "../state/metaSlice";

describe("Starting Conditions with Meta Upgrades", () => {
  describe("Bio Structure Upgrades", () => {
    it("should apply starting extractor tier boost", () => {
      const bio: BioStructureUpgrades = {
        startingRadius: 4,
        startingExtractorTier: 3,
        passiveCoolingBonus: 0,
        startingCoreInventory: {},
      };

      const world = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio,
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Find the starting Extractor
      const extractorEntry = Object.entries(world.entityType).find(
        ([_, type]) => type === "Extractor"
      );
      expect(extractorEntry).toBeDefined();

      const extractorId = Number(extractorEntry![0]);
      const producer = world.producer[extractorId];
      expect(producer).toBeDefined();
      expect(producer?.tier).toBe(3);

      // Verify heat generation scales with tier
      const heatSource = world.heatSource[extractorId];
      expect(heatSource?.heatPerSecond).toBe(0.5 * 3);
    });

    it("should apply passive cooling bonus to heat cap", () => {
      const bio: BioStructureUpgrades = {
        startingRadius: 4,
        startingExtractorTier: 1,
        passiveCoolingBonus: 5,
        startingCoreInventory: {},
      };

      const world = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio,
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Base heat cap is 100, bonus is 20 per level
      const expectedHeatCap = 100 + 5 * 20;
      expect(world.globals.heatSafeCap).toBe(expectedHeatCap);

      // Core should have a heat sink when passive cooling > 0
      const coreEntry = Object.entries(world.entityType).find(
        ([_, type]) => type === "Core"
      );
      const coreId = Number(coreEntry![0]);
      const heatSink = world.heatSink[coreId];
      expect(heatSink).toBeDefined();
      expect(heatSink?.coolingPerSecond).toBe(0.2 * 5);
    });

    it("should add starting inventory to Core", () => {
      const bio: BioStructureUpgrades = {
        startingRadius: 4,
        startingExtractorTier: 1,
        passiveCoolingBonus: 0,
        startingCoreInventory: {
          Components: 50,
          TissueMass: 25,
        },
      };

      const world = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio,
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      const coreEntry = Object.entries(world.entityType).find(
        ([_, type]) => type === "Core"
      );
      const coreId = Number(coreEntry![0]);
      const inventory = world.inventory[coreId];

      expect(inventory).toBeDefined();
      // Starting inventory includes both meta bonuses and base starting resources
      expect(inventory?.contents.Components).toBeGreaterThanOrEqual(50);
      expect(inventory?.contents.TissueMass).toBeGreaterThanOrEqual(25);
    });
  });

  describe("Swarm Cognition Upgrades", () => {
    it("should spawn specialist hauler drones", () => {
      const swarm: SwarmCognitionUpgrades = {
        congestionAvoidanceLevel: 0,
        prefetchUnlocked: false,
        startingSpecialists: { hauler: 3, builder: 0, maintainer: 0 },
        multiDropUnlocked: false,
      };

      const world = createWorld({
        swarm,
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Count hauler drones
      const haulers = Object.entries(world.droneBrain).filter(
        ([_, brain]) => brain.role === "hauler"
      );

      // Should have 1 (base) + 3 (bonus) = 4 haulers
      expect(haulers.length).toBe(4);
    });

    it("should spawn specialist builder drones", () => {
      const swarm: SwarmCognitionUpgrades = {
        congestionAvoidanceLevel: 0,
        prefetchUnlocked: false,
        startingSpecialists: { hauler: 0, builder: 2, maintainer: 0 },
        multiDropUnlocked: false,
      };

      const world = createWorld({
        swarm,
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Count builder drones
      const builders = Object.entries(world.droneBrain).filter(
        ([_, brain]) => brain.role === "builder"
      );

      // Should have 1 (base) + 2 (bonus) = 3 builders
      expect(builders.length).toBe(3);
    });

    it("should spawn specialist maintainer drones", () => {
      const swarm: SwarmCognitionUpgrades = {
        congestionAvoidanceLevel: 0,
        prefetchUnlocked: false,
        startingSpecialists: { hauler: 0, builder: 0, maintainer: 2 },
        multiDropUnlocked: false,
      };

      const world = createWorld({
        swarm,
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Count maintainer drones
      const maintainers = Object.entries(world.droneBrain).filter(
        ([_, brain]) => brain.role === "maintainer"
      );

      // Should have 0 (base) + 2 (bonus) = 2 maintainers
      expect(maintainers.length).toBe(2);
    });

    it("should increase build radius for builder specialists", () => {
      const swarm: SwarmCognitionUpgrades = {
        congestionAvoidanceLevel: 0,
        prefetchUnlocked: false,
        startingSpecialists: { hauler: 0, builder: 3, maintainer: 0 },
        multiDropUnlocked: false,
      };

      const world = createWorld({
        swarm,
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Get all drones and check their build radius
      const builderDrones = Object.entries(world.droneBrain).filter(
        ([_, brain]) => brain.role === "builder"
      );

      expect(builderDrones.length).toBeGreaterThan(0);

      // Builders should have enhanced build radius
      // Base behavior buildRadius = 5 + 3 (startingSpecialists.builder)
      // Builder drones get +2 more
      const expectedBuilderRadius = 5 + 3 + 2;
      builderDrones.forEach(([_, brain]) => {
        expect(brain.behavior.buildRadius).toBe(expectedBuilderRadius);
      });

      // Non-builders should have standard radius
      const haulerDrones = Object.entries(world.droneBrain).filter(
        ([_, brain]) => brain.role === "hauler"
      );
      const expectedHaulerRadius = 5 + 3;
      haulerDrones.forEach(([_, brain]) => {
        expect(brain.behavior.buildRadius).toBe(expectedHaulerRadius);
      });
    });
  });

  describe("Compiler Optimization Upgrades", () => {
    it("should not affect starting world state directly", () => {
      // Compiler upgrades affect gameplay mechanics but not initial world state
      const compiler: CompilerOptimizationUpgrades = {
        compileYieldMult: 2.0,
        overclockEfficiencyBonus: 10,
        recycleBonus: 20,
        startingForkPoints: 3,
      };

      const world = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler,
      });

      // Compiler upgrades don't change initial world structure
      // They affect compile yield, overclock efficiency, recycle bonus, and fork points
      // These are applied in other systems (balance.ts, runSlice.ts)
      expect(world).toBeDefined();
      expect(world.globals).toBeDefined();
    });
  });

  describe("Combined Upgrades - Progression Across Runs", () => {
    it("Run 2 should be meaningfully faster than Run 1", () => {
      // Simulate Run 1 (no upgrades)
      const run1World = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Simulate Run 2 (with early upgrades)
      const run2World = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 2, builder: 1, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio: {
          startingRadius: 6,
          startingExtractorTier: 2,
          passiveCoolingBonus: 2,
          startingCoreInventory: { Components: 30, TissueMass: 10 },
        },
        compiler: {
          compileYieldMult: 1.2,
          overclockEfficiencyBonus: 0,
          recycleBonus: 5,
          startingForkPoints: 1,
        },
      });

      // Run 2 advantages:
      // 1. More drones (3 haulers + 2 builders vs 1 hauler + 1 builder)
      const run1Drones = Object.keys(run1World.droneBrain).length;
      const run2Drones = Object.keys(run2World.droneBrain).length;
      expect(run2Drones).toBeGreaterThan(run1Drones);

      // 2. Higher extractor tier
      const run1Extractor = Object.entries(run1World.entityType).find(
        ([_, type]) => type === "Extractor"
      );
      const run2Extractor = Object.entries(run2World.entityType).find(
        ([_, type]) => type === "Extractor"
      );
      const run1Tier = run1World.producer[Number(run1Extractor![0])]?.tier;
      const run2Tier = run2World.producer[Number(run2Extractor![0])]?.tier;
      expect(run2Tier).toBeGreaterThan(run1Tier!);

      // 3. Higher heat capacity
      expect(run2World.globals.heatSafeCap).toBeGreaterThan(run1World.globals.heatSafeCap);

      // 4. More starting resources
      const run1CoreId = Number(
        Object.entries(run1World.entityType).find(([_, type]) => type === "Core")![0]
      );
      const run2CoreId = Number(
        Object.entries(run2World.entityType).find(([_, type]) => type === "Core")![0]
      );

      const run1Components = run1World.inventory[run1CoreId]?.contents.Components || 0;
      const run2Components = run2World.inventory[run2CoreId]?.contents.Components || 0;
      expect(run2Components).toBeGreaterThan(run1Components);
    });

    it("Each tree should provide distinct benefits", () => {
      // Swarm tree: More drones and better AI
      const swarmWorld = createWorld({
        swarm: {
          congestionAvoidanceLevel: 2,
          prefetchUnlocked: true,
          startingSpecialists: { hauler: 5, builder: 3, maintainer: 2 },
          multiDropUnlocked: true,
        },
        bio: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Bio tree: Better infrastructure and heat management
      const bioWorld = createWorld({
        swarm: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bio: {
          startingRadius: 8,
          startingExtractorTier: 4,
          passiveCoolingBonus: 10,
          startingCoreInventory: { Components: 100, TissueMass: 50 },
        },
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Compiler tree: Better efficiency and rewards
      // (These are runtime bonuses, not world state changes)

      // Verify swarm advantages
      const swarmDrones = Object.keys(swarmWorld.droneBrain).length;
      const bioDrones = Object.keys(bioWorld.droneBrain).length;
      expect(swarmDrones).toBeGreaterThan(bioDrones);

      // Verify bio advantages
      expect(bioWorld.globals.heatSafeCap).toBeGreaterThan(swarmWorld.globals.heatSafeCap);

      const bioExtractor = Object.entries(bioWorld.entityType).find(
        ([_, type]) => type === "Extractor"
      );
      const swarmExtractor = Object.entries(swarmWorld.entityType).find(
        ([_, type]) => type === "Extractor"
      );
      const bioTier = bioWorld.producer[Number(bioExtractor![0])]?.tier;
      const swarmTier = swarmWorld.producer[Number(swarmExtractor![0])]?.tier;
      expect(bioTier).toBeGreaterThan(swarmTier!);
    });
  });
});
