import { describe, it, expect, beforeEach } from "vitest";
import { canAffordBuilding, placeBuilding, BUILDING_COSTS } from "../state/buildingActions";
import { World } from "../ecs/world/World";
import { DEFAULT_UNLOCK_STATE } from "../types/unlocks";

describe("Building Placement and Cost Validation", () => {
  let world: World;
  let coreId: number;

  beforeEach(() => {
    world = {
      nextEntityId: 2,
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
      builderTargets: {},
      grid: {
        width: 64,
        height: 64,
        walkCost: new Array(64 * 64).fill(1),
      },
    };

    // Create Core with initial resources
    coreId = 1;
    world.entityType[coreId] = "Core";
    world.position[coreId] = { x: 32, y: 32 };
    world.inventory[coreId] = {
      capacity: 999,
      contents: {
        Carbon: 50,
        Components: 100,
        TissueMass: 50,
      },
    };
  });

  describe("Cost Validation", () => {
    it("should correctly define building costs", () => {
      expect(BUILDING_COSTS.Extractor).toEqual({ Components: 10 });
      expect(BUILDING_COSTS.Assembler).toEqual({ Components: 20, TissueMass: 5 });
      expect(BUILDING_COSTS.Fabricator).toEqual({ Components: 30, TissueMass: 10 });
      expect(BUILDING_COSTS.Cooler).toEqual({ Components: 25, TissueMass: 10 });
      expect(BUILDING_COSTS.Storage).toEqual({ Components: 15 });
    });

    it("should allow building when resources are sufficient", () => {
      const canAfford = canAffordBuilding(world, "Extractor");
      expect(canAfford).toBe(true);
    });

    it("should deny building when resources are insufficient", () => {
      // Drain Components
      world.inventory[coreId].contents.Components = 5;

      const canAfford = canAffordBuilding(world, "Extractor");
      expect(canAfford).toBe(false);
    });

    it("should check all required resources", () => {
      // Have enough Components but not TissueMass
      world.inventory[coreId].contents.TissueMass = 2;

      const canAfford = canAffordBuilding(world, "Assembler");
      expect(canAfford).toBe(false);
    });

    it("should allow building when all resources are exactly sufficient", () => {
      world.inventory[coreId].contents.Components = 10;
      world.inventory[coreId].contents.TissueMass = 0;

      const canAfford = canAffordBuilding(world, "Extractor");
      expect(canAfford).toBe(true);
    });
  });

  describe("Building Placement", () => {
    it("should successfully place a building when affordable", () => {
      const initialComponents = world.inventory[coreId].contents.Components || 0;
      const cost = BUILDING_COSTS.Extractor.Components;

      const success = placeBuilding(world, "Extractor", 34, 32);

      expect(success).toBe(true);
      expect(world.inventory[coreId].contents.Components).toBe(initialComponents - cost);

      // Verify building was created
      const buildings = Object.entries(world.entityType).filter(
        ([_, type]) => type === "Extractor"
      );
      expect(buildings.length).toBe(1);
    });

    it("should deduct correct costs for buildings with multiple resources", () => {
      const initialComponents = world.inventory[coreId].contents.Components || 0;
      const initialTissue = world.inventory[coreId].contents.TissueMass || 0;

      const success = placeBuilding(world, "Assembler", 30, 34);

      expect(success).toBe(true);
      expect(world.inventory[coreId].contents.Components).toBe(
        initialComponents - BUILDING_COSTS.Assembler.Components
      );
      expect(world.inventory[coreId].contents.TissueMass).toBe(
        initialTissue - BUILDING_COSTS.Assembler.TissueMass
      );
    });

    it("should fail to place building when unaffordable", () => {
      world.inventory[coreId].contents.Components = 5;

      const success = placeBuilding(world, "Extractor", 36, 32);

      expect(success).toBe(false);

      // Verify no building was created
      const buildings = Object.entries(world.entityType).filter(
        ([_, type]) => type === "Extractor"
      );
      expect(buildings.length).toBe(0);
    });

    it("should fail to place building at occupied position", () => {
      // Place first building
      placeBuilding(world, "Extractor", 34, 32);

      const initialComponents = world.inventory[coreId].contents.Components || 0;

      // Try to place another at the same position
      const success = placeBuilding(world, "Assembler", 34, 32);

      expect(success).toBe(false);
      // Cost should not be deducted
      expect(world.inventory[coreId].contents.Components).toBe(initialComponents);
    });

    it("should create building with correct components", () => {
      const success = placeBuilding(world, "Fabricator", 28, 32);

      expect(success).toBe(true);

      // Find the new building
      const buildings = Object.entries(world.entityType).filter(
        ([_, type]) => type === "Fabricator"
      );
      expect(buildings.length).toBe(1);

      const buildingId = Number(buildings[0][0]);

      // Verify it has correct components
      expect(world.position[buildingId]).toEqual({ x: 28, y: 32 });
      expect(world.inventory[buildingId]).toBeDefined();
      expect(world.producer[buildingId]).toBeDefined();
      expect(world.powerLink[buildingId]).toBeDefined();
    });
  });

  describe("Multiple Building Placement", () => {
    it("should allow placing multiple buildings if resources permit", () => {
      const success1 = placeBuilding(world, "Extractor", 34, 32);
      const success2 = placeBuilding(world, "Extractor", 36, 32);
      const success3 = placeBuilding(world, "Extractor", 38, 32);

      expect(success1).toBe(true);
      expect(success2).toBe(true);
      expect(success3).toBe(true);

      const extractors = Object.entries(world.entityType).filter(
        ([_, type]) => type === "Extractor"
      );
      expect(extractors.length).toBe(3);
    });

    it("should stop placing when resources run out", () => {
      world.inventory[coreId].contents.Components = 25; // Enough for 2 extractors (10 each)

      const success1 = placeBuilding(world, "Extractor", 34, 32);
      const success2 = placeBuilding(world, "Extractor", 36, 32);
      const success3 = placeBuilding(world, "Extractor", 38, 32);

      expect(success1).toBe(true);
      expect(success2).toBe(true);
      expect(success3).toBe(false); // Not enough resources for 3rd

      expect(world.inventory[coreId].contents.Components).toBe(5);
    });
  });
});
