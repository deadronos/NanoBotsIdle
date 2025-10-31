import { describe, it, expect, beforeEach } from "vitest";
import { createWorld } from "../ecs/world/createWorld";
import { World } from "../ecs/world/World";
import {
  placeBuilding,
  upgradeBuilding,
  canAffordBuilding,
  EXTRACTOR_RECIPES,
  ASSEMBLER_RECIPES,
  BUILDING_COSTS,
} from "../state/buildingActions";
import { storageHubSystem } from "../ecs/systems/storageHubSystem";
import { getBuildingUpgradeCost } from "../sim/balance";

describe("Additional Building Types (Milestone 4.4)", () => {
  let world: World;

  beforeEach(() => {
    world = createWorld({
      swarm: {
        congestionAvoidanceLevel: 0,
        prefetchUnlocked: false,
        multiDropUnlocked: false,
        startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
      },
      bio: {
        startingRadius: 0,
        passiveCoolingBonus: 0,
        startingExtractorTier: 1,
        startingCoreInventory: {
          Components: 200,
          TissueMass: 100,
        },
      },
      compiler: {
        compileYieldMult: 1.0,
        overclockEfficiencyBonus: 0,
        recycleBonus: 0,
        startingForkPoints: 0,
      },
    });
  });

  describe("Storage Building", () => {
    it("should provide capacity bonus to nearby buildings", () => {
      // Place a Storage building
      const storageX = 35;
      const storageY = 32;
      placeBuilding(world, "Storage", storageX, storageY);

      // Find buildings near the Storage
      const extractorId = Object.entries(world.entityType).find(
        ([_, type]) => type === "Extractor"
      )?.[0];
      expect(extractorId).toBeDefined();

      const extractorInv = world.inventory[Number(extractorId!)];
      const baseCapacity = extractorInv.capacity;

      // Run storage hub system
      storageHubSystem(world, 0);

      // Check that extractor capacity increased
      expect(extractorInv.capacity).toBeGreaterThan(baseCapacity);
    });

    it("should have correct StorageHub properties", () => {
      placeBuilding(world, "Storage", 40, 40);

      const storageId = Object.entries(world.entityType).find(
        ([_, type]) => type === "Storage"
      )?.[0];
      expect(storageId).toBeDefined();

      const storageHub = world.storageHub[Number(storageId!)];
      expect(storageHub).toBeDefined();
      expect(storageHub.radius).toBe(5);
      expect(storageHub.capacityBonus).toBe(25);
      expect(storageHub.haulingEfficiencyBonus).toBe(0.15);
    });

    it("should not affect buildings outside radius", () => {
      // Place Storage far away
      placeBuilding(world, "Storage", 50, 50);

      const extractorId = Object.entries(world.entityType).find(
        ([_, type]) => type === "Extractor"
      )?.[0];
      const extractorInv = world.inventory[Number(extractorId!)];
      const baseCapacity = extractorInv.capacity;

      storageHubSystem(world, 0);

      // Capacity should not change (too far)
      expect(extractorInv.capacity).toBe(baseCapacity);
    });
  });

  describe("CoreCompiler Building", () => {
    it("should have correct production parameters", () => {
      placeBuilding(world, "CoreCompiler", 40, 40);

      const compilerId = Object.entries(world.entityType).find(
        ([_, type]) => type === "CoreCompiler"
      )?.[0];
      expect(compilerId).toBeDefined();

      const producer = world.producer[Number(compilerId!)];
      expect(producer).toBeDefined();
      expect(producer.baseRate).toBe(0.2);
      expect(producer.tier).toBe(1);

      const overclockable = world.overclockable[Number(compilerId!)];
      expect(overclockable).toBeDefined();
      expect(overclockable.overRateMult).toBe(4.0);
      expect(overclockable.heatMultiplier).toBe(6.0);

      const compileEmitter = world.compileEmitter[Number(compilerId!)];
      expect(compileEmitter).toBeDefined();
      expect(compileEmitter.throughputWeight).toBe(3);
    });

    it("should have correct recipe", () => {
      placeBuilding(world, "CoreCompiler", 40, 40);

      const compilerId = Object.entries(world.entityType).find(
        ([_, type]) => type === "CoreCompiler"
      )?.[0];
      const producer = world.producer[Number(compilerId!)];

      expect(producer.recipe.inputs).toHaveProperty("Components");
      expect(producer.recipe.inputs).toHaveProperty("TissueMass");
      expect(producer.recipe.outputs).toHaveProperty("CompileShards");
    });
  });

  describe("Building Tier Upgrade System", () => {
    it("should upgrade building tier when affordable", () => {
      const extractorId = Object.entries(world.entityType).find(
        ([_, type]) => type === "Extractor"
      )?.[0];
      expect(extractorId).toBeDefined();

      const producer = world.producer[Number(extractorId!)];
      const initialTier = producer.tier;

      const success = upgradeBuilding(world, Number(extractorId!));
      expect(success).toBe(true);
      expect(producer.tier).toBe(initialTier + 1);
    });

    it("should not upgrade when cannot afford", () => {
      const extractorId = Object.entries(world.entityType).find(
        ([_, type]) => type === "Extractor"
      )?.[0];

      // Drain core resources
      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      const coreInv = world.inventory[Number(coreId!)];
      coreInv.contents = {};

      const producer = world.producer[Number(extractorId!)];
      const initialTier = producer.tier;

      const success = upgradeBuilding(world, Number(extractorId!));
      expect(success).toBe(false);
      expect(producer.tier).toBe(initialTier);
    });

    it("should have different costs for different building types", () => {
      const extractorCost = getBuildingUpgradeCost(2, "Extractor");
      const assemblerCost = getBuildingUpgradeCost(2, "Assembler");
      const fabricatorCost = getBuildingUpgradeCost(2, "Fabricator");
      const compilerCost = getBuildingUpgradeCost(2, "CoreCompiler");

      // CoreCompiler should be most expensive
      expect(compilerCost.Components).toBeGreaterThan(extractorCost.Components || 0);
      expect(compilerCost.Components).toBeGreaterThan(assemblerCost.Components || 0);
      expect(compilerCost.Components).toBeGreaterThan(fabricatorCost.Components || 0);
    });
  });

  describe("New Resource Types", () => {
    it("should have recipes for Iron and Silicon extractors", () => {
      expect(EXTRACTOR_RECIPES).toHaveProperty("Carbon");
      expect(EXTRACTOR_RECIPES).toHaveProperty("Iron");
      expect(EXTRACTOR_RECIPES).toHaveProperty("Silicon");

      expect(EXTRACTOR_RECIPES.Iron.outputs).toHaveProperty("Iron");
      expect(EXTRACTOR_RECIPES.Silicon.outputs).toHaveProperty("Silicon");
    });

    it("should have advanced assembler recipes", () => {
      expect(ASSEMBLER_RECIPES).toHaveProperty("BasicComponents");
      expect(ASSEMBLER_RECIPES).toHaveProperty("IronComponents");
      expect(ASSEMBLER_RECIPES).toHaveProperty("SiliconComponents");

      // Iron recipe should produce more components
      const basicOutput = ASSEMBLER_RECIPES.BasicComponents.outputs.Components;
      const ironOutput = ASSEMBLER_RECIPES.IronComponents.outputs.Components;
      expect(ironOutput).toBeGreaterThan(basicOutput || 0);
    });
  });

  describe("Building Costs", () => {
    it("should have correct costs for new buildings", () => {
      expect(BUILDING_COSTS.Storage).toEqual({ Components: 15 });
      expect(BUILDING_COSTS.CoreCompiler).toEqual({ Components: 100, TissueMass: 50 });
    });

    it("should be able to afford Storage with starting resources", () => {
      expect(canAffordBuilding(world, "Storage")).toBe(true);
    });

    it("should be able to afford CoreCompiler with boosted starting resources", () => {
      expect(canAffordBuilding(world, "CoreCompiler")).toBe(true);
    });
  });
});
