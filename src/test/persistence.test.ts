import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveGame,
  loadGame,
  deleteSave,
  hasSave,
  exportSave,
  importSave,
  getSaveMetadata,
  SaveData,
} from "../state/persistence";
import { tickWorld } from "../ecs/world/tickWorld";
import { createWorld } from "../ecs/world/createWorld";
import { MetaSlice } from "../state/metaSlice";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Persistence System", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("saveGame and loadGame", () => {
    it("should save and load game state successfully", () => {
      const meta: MetaSlice = {
        compileShardsBanked: 100,
        totalPrestiges: 5,
        purchasedUpgrades: [],
        swarmCognition: {
          congestionAvoidanceLevel: 2,
          prefetchUnlocked: true,
          startingSpecialists: { hauler: 3, builder: 1, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bioStructure: {
          startingRadius: 6,
          startingExtractorTier: 2,
          passiveCoolingBonus: 10,
          startingCoreInventory: { Components: 50 },
        },
        compilerOptimization: {
          compileYieldMult: 1.5,
          overclockEfficiencyBonus: 5,
          recycleBonus: 10,
          startingForkPoints: 2,
        },
        spendShards: () => {},
        getAvailableUpgrades: () => [],
        canPurchaseUpgrade: () => ({ canPurchase: false }),
        purchaseUpgrade: () => false,
      };

      const world = createWorld({
        swarm: meta.swarmCognition,
        bio: meta.bioStructure,
        compiler: meta.compilerOptimization,
      });

      const run = {
        world,
        projectedCompileShards: 50,
        forkPoints: 1,
        currentPhase: 2 as const,
      };

      // Save game
      const saveResult = saveGame(meta, run);
      expect(saveResult).toBe(true);

      // Verify save exists
      expect(hasSave()).toBe(true);

      // Load game
      const loadedData = loadGame();
      expect(loadedData).not.toBeNull();

      if (loadedData) {
        expect(loadedData.version).toBe(1);
        expect(loadedData.meta.compileShardsBanked).toBe(100);
        expect(loadedData.meta.totalPrestiges).toBe(5);
        expect(loadedData.run.projectedCompileShards).toBe(50);
        expect(loadedData.run.forkPoints).toBe(1);
        expect(loadedData.run.currentPhase).toBe(2);
      }
    });

    it("should return null when no save exists", () => {
      const loadedData = loadGame();
      expect(loadedData).toBeNull();
      expect(hasSave()).toBe(false);
    });

    it("should handle corrupted save data gracefully", () => {
      // Store invalid JSON
      localStorageMock.setItem("nanofactory-save", "invalid json {[}");

      const loadedData = loadGame();
      expect(loadedData).toBeNull();
    });

    it("should handle save data with missing required fields", () => {
      // Store save data with missing fields
      const invalidSave = {
        version: 1,
        timestamp: Date.now(),
        // Missing meta and run
      };

      localStorageMock.setItem("nanofactory-save", JSON.stringify(invalidSave));

      const loadedData = loadGame();
      expect(loadedData).toBeNull();
    });

    it("should tolerate world.globals.milestones stored as an object and not throw when ticking", () => {
      // Create a fresh world then deliberately corrupt the milestones shape
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
        compiler: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
      });

      // Simulate an old or manually edited save that stores milestones as an object map
      (world.globals as any).milestones = {
        milestone_2min: {
          id: "milestone_2min",
          name: "Bootstrap Phase",
          description: "Your first factory is operational",
          timeSeconds: 0,
        },
      };

      // Ensure ticking the world does not throw (unlockSystem will iterate defensively)
      expect(() => tickWorld(world, 1)).not.toThrow();

      // After ticking, the milestone value should have been updated (achieved flag added)
      const mv = (world.globals as any).milestones["milestone_2min"];
      expect(mv).toBeDefined();
      expect(mv.achieved === true || mv.achieved === false).toBe(true);
    });
  });

  describe("deleteSave", () => {
    it("should delete existing save", () => {
      const meta: MetaSlice = {
        compileShardsBanked: 100,
        totalPrestiges: 5,
        purchasedUpgrades: [],
        swarmCognition: {
          congestionAvoidanceLevel: 0,
          prefetchUnlocked: false,
          startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
          multiDropUnlocked: false,
        },
        bioStructure: {
          startingRadius: 4,
          startingExtractorTier: 1,
          passiveCoolingBonus: 0,
          startingCoreInventory: {},
        },
        compilerOptimization: {
          compileYieldMult: 1.0,
          overclockEfficiencyBonus: 0,
          recycleBonus: 0,
          startingForkPoints: 0,
        },
        spendShards: () => {},
        getAvailableUpgrades: () => [],
        canPurchaseUpgrade: () => ({ canPurchase: false }),
        purchaseUpgrade: () => false,
      };

      const world = createWorld({
        swarm: meta.swarmCognition,
        bio: meta.bioStructure,
        compiler: meta.compilerOptimization,
      });

      saveGame(meta, {
        world,
        projectedCompileShards: 0,
        forkPoints: 0,
        currentPhase: 1,
      });

      expect(hasSave()).toBe(true);

      const deleteResult = deleteSave();
      expect(deleteResult).toBe(true);
      expect(hasSave()).toBe(false);
    });
  });

  describe("exportSave and importSave", () => {
    it("should export save as JSON string", () => {
      const meta: MetaSlice = {
        compileShardsBanked: 200,
        totalPrestiges: 10,
        purchasedUpgrades: [],
        swarmCognition: {
          congestionAvoidanceLevel: 1,
          prefetchUnlocked: true,
          startingSpecialists: { hauler: 2, builder: 1, maintainer: 1 },
          multiDropUnlocked: false,
        },
        bioStructure: {
          startingRadius: 5,
          startingExtractorTier: 1,
          passiveCoolingBonus: 5,
          startingCoreInventory: {},
        },
        compilerOptimization: {
          compileYieldMult: 1.2,
          overclockEfficiencyBonus: 0,
          recycleBonus: 5,
          startingForkPoints: 1,
        },
        spendShards: () => {},
        getAvailableUpgrades: () => [],
        canPurchaseUpgrade: () => ({ canPurchase: false }),
        purchaseUpgrade: () => false,
      };

      const world = createWorld({
        swarm: meta.swarmCognition,
        bio: meta.bioStructure,
        compiler: meta.compilerOptimization,
      });

      saveGame(meta, {
        world,
        projectedCompileShards: 25,
        forkPoints: 0,
        currentPhase: 1,
      });

      const exported = exportSave();
      expect(exported).not.toBeNull();

      if (exported) {
        const parsed = JSON.parse(exported);
        expect(parsed.version).toBe(1);
        expect(parsed.meta.compileShardsBanked).toBe(200);
      }
    });

    it("should import save from JSON string", () => {
      const meta: MetaSlice = {
        compileShardsBanked: 300,
        totalPrestiges: 15,
        purchasedUpgrades: [],
        swarmCognition: {
          congestionAvoidanceLevel: 2,
          prefetchUnlocked: true,
          startingSpecialists: { hauler: 5, builder: 2, maintainer: 1 },
          multiDropUnlocked: true,
        },
        bioStructure: {
          startingRadius: 8,
          startingExtractorTier: 3,
          passiveCoolingBonus: 20,
          startingCoreInventory: { Components: 100, TissueMass: 50 },
        },
        compilerOptimization: {
          compileYieldMult: 2.0,
          overclockEfficiencyBonus: 15,
          recycleBonus: 25,
          startingForkPoints: 3,
        },
        spendShards: () => {},
        getAvailableUpgrades: () => [],
        canPurchaseUpgrade: () => ({ canPurchase: false }),
        purchaseUpgrade: () => false,
      };

      const world = createWorld({
        swarm: meta.swarmCognition,
        bio: meta.bioStructure,
        compiler: meta.compilerOptimization,
      });

      const saveData: SaveData = {
        version: 1,
        timestamp: Date.now(),
        meta: {
          compileShardsBanked: 300,
          totalPrestiges: 15,
          swarmCognition: meta.swarmCognition,
          bioStructure: meta.bioStructure,
          compilerOptimization: meta.compilerOptimization,
        },
        run: {
          world,
          projectedCompileShards: 75,
          forkPoints: 2,
          currentPhase: 3,
        },
      };

      const jsonString = JSON.stringify(saveData);

      // Clear any existing save
      deleteSave();

      const importResult = importSave(jsonString);
      expect(importResult).toBe(true);
      expect(hasSave()).toBe(true);

      const loaded = loadGame();
      expect(loaded).not.toBeNull();
      if (loaded) {
        expect(loaded.meta.compileShardsBanked).toBe(300);
        expect(loaded.meta.totalPrestiges).toBe(15);
      }
    });

    it("should reject invalid import data", () => {
      const invalidJson = "not valid json";
      const importResult = importSave(invalidJson);
      expect(importResult).toBe(false);
      expect(hasSave()).toBe(false);
    });
  });

  describe("getSaveMetadata", () => {
    it("should retrieve save metadata without loading full save", () => {
      const meta: MetaSlice = {
        compileShardsBanked: 500,
        totalPrestiges: 25,
        purchasedUpgrades: [],
        swarmCognition: {
          congestionAvoidanceLevel: 3,
          prefetchUnlocked: true,
          startingSpecialists: { hauler: 10, builder: 5, maintainer: 3 },
          multiDropUnlocked: true,
        },
        bioStructure: {
          startingRadius: 10,
          startingExtractorTier: 5,
          passiveCoolingBonus: 50,
          startingCoreInventory: { Components: 200 },
        },
        compilerOptimization: {
          compileYieldMult: 3.0,
          overclockEfficiencyBonus: 30,
          recycleBonus: 50,
          startingForkPoints: 5,
        },
        spendShards: () => {},
        getAvailableUpgrades: () => [],
        canPurchaseUpgrade: () => ({ canPurchase: false }),
        purchaseUpgrade: () => false,
      };

      const world = createWorld({
        swarm: meta.swarmCognition,
        bio: meta.bioStructure,
        compiler: meta.compilerOptimization,
      });

      saveGame(meta, {
        world,
        projectedCompileShards: 100,
        forkPoints: 3,
        currentPhase: 3,
      });

      const metadata = getSaveMetadata();
      expect(metadata).not.toBeNull();

      if (metadata) {
        expect(metadata.version).toBe(1);
        expect(metadata.shards).toBe(500);
        expect(metadata.prestiges).toBe(25);
        expect(typeof metadata.timestamp).toBe("number");
      }
    });

    it("should return null when no save exists", () => {
      const metadata = getSaveMetadata();
      expect(metadata).toBeNull();
    });
  });
});
