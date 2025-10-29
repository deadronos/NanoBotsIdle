import { describe, it, expect } from "vitest";
import {
  migrateSaveData,
  validateSaveData,
  migrations,
  MigrationFunction,
} from "../state/migrations";
import { SaveData } from "../state/persistence";
import { createWorld } from "../ecs/world/createWorld";

describe("Migration System", () => {
  describe("validateSaveData", () => {
    it("should validate correct save data structure", () => {
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

      const validSave: SaveData = {
        version: 1,
        timestamp: Date.now(),
        meta: {
          compileShardsBanked: 100,
          totalPrestiges: 5,
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
        },
        run: {
          world,
          projectedCompileShards: 50,
          forkPoints: 1,
          currentPhase: 2,
        },
      };

      expect(validateSaveData(validSave)).toBe(true);
    });

    it("should reject save data with missing version", () => {
      const invalidSave = {
        timestamp: Date.now(),
        meta: { compileShardsBanked: 100, totalPrestiges: 5 },
        run: { world: {}, projectedCompileShards: 50 },
      };

      expect(validateSaveData(invalidSave)).toBe(false);
    });

    it("should reject save data with missing meta", () => {
      const invalidSave = {
        version: 1,
        timestamp: Date.now(),
        run: { world: {}, projectedCompileShards: 50 },
      };

      expect(validateSaveData(invalidSave)).toBe(false);
    });

    it("should reject save data with missing run", () => {
      const invalidSave = {
        version: 1,
        timestamp: Date.now(),
        meta: { compileShardsBanked: 100, totalPrestiges: 5 },
      };

      expect(validateSaveData(invalidSave)).toBe(false);
    });

    it("should reject non-object save data", () => {
      expect(validateSaveData(null)).toBe(false);
      expect(validateSaveData(undefined)).toBe(false);
      expect(validateSaveData(123)).toBe(false);
      expect(validateSaveData("string")).toBe(false);
      expect(validateSaveData([])).toBe(false);
    });

    it("should reject save data with invalid meta structure", () => {
      const invalidSave = {
        version: 1,
        timestamp: Date.now(),
        meta: {
          compileShardsBanked: "not a number", // Should be number
          totalPrestiges: 5,
        },
        run: { world: {}, projectedCompileShards: 50 },
      };

      expect(validateSaveData(invalidSave)).toBe(false);
    });
  });

  describe("migrateSaveData", () => {
    it("should return unchanged data when already at target version", () => {
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

      const saveData: SaveData = {
        version: 1,
        timestamp: Date.now(),
        meta: {
          compileShardsBanked: 100,
          totalPrestiges: 5,
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
        },
        run: {
          world,
          projectedCompileShards: 50,
          forkPoints: 1,
          currentPhase: 2,
        },
      };

      const migrated = migrateSaveData(saveData, 1);
      expect(migrated.version).toBe(1);
      expect(migrated.meta.compileShardsBanked).toBe(100);
    });

    it("should handle save version newer than target (with warning)", () => {
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

      const saveData: SaveData = {
        version: 5, // Future version
        timestamp: Date.now(),
        meta: {
          compileShardsBanked: 100,
          totalPrestiges: 5,
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
        },
        run: {
          world,
          projectedCompileShards: 50,
          forkPoints: 1,
          currentPhase: 2,
        },
      };

      // Should return the data unchanged with a warning
      const migrated = migrateSaveData(saveData, 1);
      expect(migrated.version).toBe(5);
    });

    it("should apply sequential migrations", () => {
      // Set up test migrations
      const testMigration1: MigrationFunction = (saveData: SaveData): SaveData => {
        return {
          ...saveData,
          version: 2,
          meta: {
            ...saveData.meta,
            compileShardsBanked: saveData.meta.compileShardsBanked * 2, // Double shards
          },
        };
      };

      const testMigration2: MigrationFunction = (saveData: SaveData): SaveData => {
        return {
          ...saveData,
          version: 3,
          meta: {
            ...saveData.meta,
            totalPrestiges: saveData.meta.totalPrestiges + 1, // Add bonus prestige
          },
        };
      };

      // Temporarily add test migrations
      const originalMigrations = { ...migrations };
      migrations[1] = testMigration1;
      migrations[2] = testMigration2;

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

      const saveData: SaveData = {
        version: 1,
        timestamp: Date.now(),
        meta: {
          compileShardsBanked: 100,
          totalPrestiges: 5,
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
        },
        run: {
          world,
          projectedCompileShards: 50,
          forkPoints: 1,
          currentPhase: 2,
        },
      };

      const migrated = migrateSaveData(saveData, 3);

      // Verify migrations were applied
      expect(migrated.version).toBe(3);
      expect(migrated.meta.compileShardsBanked).toBe(200); // 100 * 2
      expect(migrated.meta.totalPrestiges).toBe(6); // 5 + 1

      // Restore original migrations
      Object.keys(migrations).forEach((key) => delete migrations[Number(key)]);
      Object.assign(migrations, originalMigrations);
    });

    it("should handle missing migration gracefully", () => {
      // Clear all migrations
      const originalMigrations = { ...migrations };
      Object.keys(migrations).forEach((key) => delete migrations[Number(key)]);

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

      const saveData: SaveData = {
        version: 1,
        timestamp: Date.now(),
        meta: {
          compileShardsBanked: 100,
          totalPrestiges: 5,
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
        },
        run: {
          world,
          projectedCompileShards: 50,
          forkPoints: 1,
          currentPhase: 2,
        },
      };

      // Should skip missing migration and continue
      const migrated = migrateSaveData(saveData, 3);
      expect(migrated.version).toBe(1); // Data unchanged

      // Restore original migrations
      Object.assign(migrations, originalMigrations);
    });
  });
});
