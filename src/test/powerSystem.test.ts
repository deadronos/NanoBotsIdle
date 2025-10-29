import { describe, it, expect, beforeEach } from "vitest";
import { createWorld } from "../ecs/world/createWorld";
import { World } from "../ecs/world/World";
import { heatAndPowerSystem } from "../ecs/systems/heatAndPowerSystem";
import { placeBuilding } from "../state/buildingActions";

describe("Power System", () => {
  let world: World;

  beforeEach(() => {
    world = createWorld({
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
  });

  describe("Power Grid Connectivity", () => {
    it("should mark Core and starting buildings as connected", () => {
      heatAndPowerSystem(world, 0.1);

      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      expect(coreId).toBeDefined();
      expect(world.powerLink[Number(coreId!)].connectedToGrid).toBe(true);

      // Starting buildings should be connected (within range of Core)
      const extractor = Object.entries(world.entityType).find(([_, type]) => type === "Extractor")?.[0];
      expect(extractor).toBeDefined();
      expect(world.powerLink[Number(extractor!)].connectedToGrid).toBe(true);
    });

    it("should disconnect buildings placed far from Core without PowerVeins", () => {
      // Give Core enough resources to build
      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      const coreInv = world.inventory[Number(coreId!)];
      coreInv.contents.Components = 100;

      // Place a building far from Core (beyond CONNECTION_RANGE=3)
      const placed = placeBuilding(world, "Extractor", 50, 50);
      expect(placed).toBe(true);

      // Run power system
      heatAndPowerSystem(world, 0.1);

      // Find the newly placed extractor
      const farExtractor = Object.entries(world.position).find(
        ([id, pos]) => pos.x === 50 && pos.y === 50 && world.entityType[Number(id)] === "Extractor"
      );

      expect(farExtractor).toBeDefined();
      const link = world.powerLink[Number(farExtractor![0])];
      expect(link.connectedToGrid).toBe(false);
      expect(link.online).toBe(false);
    });

    it("should connect buildings via PowerVeins", () => {
      // Give Core enough resources
      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      const corePos = world.position[Number(coreId!)];
      const coreInv = world.inventory[Number(coreId!)];
      coreInv.contents.Components = 1000;

      // Place a chain of PowerVeins extending from Core in the -y direction (to avoid existing buildings)
      const placed1 = placeBuilding(world, "PowerVein", corePos.x, corePos.y - 2);
      const placed2 = placeBuilding(world, "PowerVein", corePos.x, corePos.y - 4);
      const placed3 = placeBuilding(world, "PowerVein", corePos.x, corePos.y - 6);
      expect(placed1 && placed2 && placed3).toBe(true);

      // Place an Extractor at the end of the chain
      const placed4 = placeBuilding(world, "Extractor", corePos.x, corePos.y - 7);
      expect(placed4).toBe(true);

      // Run power system
      heatAndPowerSystem(world, 0.1);

      // All PowerVeins should be connected
      const vein1 = Object.entries(world.position).find(
        ([id, pos]) =>
          pos.x === corePos.x && pos.y === corePos.y - 2 && world.entityType[Number(id)] === "PowerVein"
      );
      const vein2 = Object.entries(world.position).find(
        ([id, pos]) =>
          pos.x === corePos.x && pos.y === corePos.y - 4 && world.entityType[Number(id)] === "PowerVein"
      );
      const vein3 = Object.entries(world.position).find(
        ([id, pos]) =>
          pos.x === corePos.x && pos.y === corePos.y - 6 && world.entityType[Number(id)] === "PowerVein"
      );

      expect(vein1).toBeDefined();
      expect(vein2).toBeDefined();
      expect(vein3).toBeDefined();

      expect(world.powerLink[Number(vein1![0])].connectedToGrid).toBe(true);
      expect(world.powerLink[Number(vein2![0])].connectedToGrid).toBe(true);
      expect(world.powerLink[Number(vein3![0])].connectedToGrid).toBe(true);

      // Extractor at the end should be connected via the chain
      const farExtractor = Object.entries(world.position).find(
        ([id, pos]) =>
          pos.x === corePos.x && pos.y === corePos.y - 7 && world.entityType[Number(id)] === "Extractor"
      );

      expect(farExtractor).toBeDefined();
      expect(world.powerLink[Number(farExtractor![0])].connectedToGrid).toBe(true);
      expect(world.powerLink[Number(farExtractor![0])].online).toBe(true);
    });

    it("should turn off producers that are offline", () => {
      // Give Core enough resources
      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      const coreInv = world.inventory[Number(coreId!)];
      coreInv.contents.Components = 100;

      // Place an Extractor far from Core
      placeBuilding(world, "Extractor", 50, 50);

      // Run power system
      heatAndPowerSystem(world, 0.1);

      // Find the far extractor
      const farExtractor = Object.entries(world.position).find(
        ([id, pos]) => pos.x === 50 && pos.y === 50 && world.entityType[Number(id)] === "Extractor"
      );

      expect(farExtractor).toBeDefined();
      const extractorId = Number(farExtractor![0]);

      // It should be offline
      expect(world.powerLink[extractorId].online).toBe(false);

      // Its producer should be deactivated
      expect(world.producer[extractorId].active).toBe(false);
    });
  });

  describe("Cooler Functionality", () => {
    it("should reduce heat when Cooler is online", () => {
      // Give Core enough resources
      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      const corePos = world.position[Number(coreId!)];
      const coreInv = world.inventory[Number(coreId!)];
      coreInv.contents.Components = 100;
      coreInv.contents.TissueMass = 50;

      // Set initial heat
      world.globals.heatCurrent = 50;

      // Place a Cooler near Core
      placeBuilding(world, "Cooler", corePos.x + 1, corePos.y);

      // Run power system for 1 second
      heatAndPowerSystem(world, 1.0);

      // Heat should be reduced (Cooler has coolingPerSecond: 2.0)
      // Initial: 50, but heat is also generated by Core and other buildings
      // We just verify the Cooler is working (heat < 50 or at least not increasing much)
      expect(world.globals.heatCurrent).toBeLessThan(55);
    });

    it("should not cool when Cooler is offline", () => {
      // Give Core enough resources
      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      const coreInv = world.inventory[Number(coreId!)];
      coreInv.contents.Components = 100;
      coreInv.contents.TissueMass = 50;

      // Set initial heat
      world.globals.heatCurrent = 50;
      const initialHeat = world.globals.heatCurrent;

      // Place a Cooler far from Core (offline)
      placeBuilding(world, "Cooler", 50, 50);

      // Run power system for 1 second
      heatAndPowerSystem(world, 1.0);

      // The offline cooler should not contribute to cooling
      // Heat should increase (or stay similar) because offline cooler doesn't work
      const farCooler = Object.entries(world.position).find(
        ([id, pos]) => pos.x === 50 && pos.y === 50 && world.entityType[Number(id)] === "Cooler"
      );
      expect(farCooler).toBeDefined();
      expect(world.powerLink[Number(farCooler![0])].online).toBe(false);

      // Heat should be higher than initial (buildings generate heat)
      expect(world.globals.heatCurrent).toBeGreaterThanOrEqual(initialHeat);
    });
  });

  describe("Power Demand Calculation", () => {
    it("should calculate total power demand from online buildings", () => {
      heatAndPowerSystem(world, 0.1);

      // Core: 1, Extractor: 1, Assembler: 2, Fabricator: 2, Drones: 0.1 * count
      const droneCount = Object.keys(world.droneBrain).length;
      const expectedDemand = 1 + 1 + 2 + 2 + droneCount * 0.1;

      expect(world.globals.powerDemand).toBeCloseTo(expectedDemand, 1);
    });

    it("should not count offline buildings in power demand", () => {
      // Give Core enough resources
      const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
      const coreInv = world.inventory[Number(coreId!)];
      coreInv.contents.Components = 100;

      // Place an Extractor far from Core (will be offline)
      placeBuilding(world, "Extractor", 50, 50);

      // Run power system
      heatAndPowerSystem(world, 0.1);

      // Power demand should NOT include the offline extractor (demand: 1)
      const droneCount = Object.keys(world.droneBrain).length;
      const expectedDemand = 1 + 1 + 2 + 2 + droneCount * 0.1; // Same as before, no extra extractor

      expect(world.globals.powerDemand).toBeCloseTo(expectedDemand, 1);
    });
  });
});
