import { describe, expect, it } from "vitest";

import { applyMigrations, getMigrationsPath } from "../src/utils/migrations/registry";
import { CURRENT_SAVE_VERSION } from "../src/utils/migrations/types";

describe("Migration Registry", () => {
  describe("getMigrationsPath", () => {
    it("should return empty array for same version", () => {
      const path = getMigrationsPath(1, 1);
      expect(path).toEqual([]);
    });

    it("should return migration path from v1 to v2", () => {
      const path = getMigrationsPath(1, 2);
      expect(path).toHaveLength(1);
      expect(path[0].fromVersion).toBe(1);
      expect(path[0].toVersion).toBe(2);
      expect(path[0].description).toBeTruthy();
    });

    it("should throw error for downgrade attempts", () => {
      expect(() => getMigrationsPath(2, 1)).toThrow("Cannot downgrade");
    });

    it("should throw error for missing migration path", () => {
      expect(() => getMigrationsPath(1, 99)).toThrow("No migration found");
    });
  });

  describe("applyMigrations", () => {
    it("should apply v1 to v2 migration successfully", () => {
      const v1Data = {
        credits: 1000,
        prestigeLevel: 2,
        droneCount: 5,
        minedBlocks: 100,
      };

      const migrations = getMigrationsPath(1, 2);
      const result = applyMigrations(v1Data, migrations);

      expect(result).toMatchObject({
        credits: 1000,
        prestigeLevel: 2,
        droneCount: 5,
        minedBlocks: 100,
        totalBlocks: 0, // Added in v2
      });
    });

    it("should handle minimal v1 data with defaults", () => {
      const v1Data = {};
      const migrations = getMigrationsPath(1, 2);
      const result = applyMigrations(v1Data, migrations) as Record<string, unknown>;

      expect(result.credits).toBe(0);
      expect(result.prestigeLevel).toBe(1);
      expect(result.droneCount).toBe(3);
      expect(result.totalBlocks).toBe(0);
    });

    it("should throw error for invalid migration data", () => {
      const invalidData = "not an object";
      const migrations = getMigrationsPath(1, 2);

      expect(() => applyMigrations(invalidData, migrations)).toThrow("Migration failed");
    });
  });

  describe("migration to current version", () => {
    it("should successfully migrate from v1 to current version", () => {
      const v1Data = {
        credits: 2500,
        prestigeLevel: 3,
        droneCount: 7,
        miningSpeedLevel: 4,
        moveSpeedLevel: 3,
        laserPowerLevel: 5,
        minedBlocks: 300,
      };

      const migrations = getMigrationsPath(1, CURRENT_SAVE_VERSION);
      const result = applyMigrations(v1Data, migrations);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });
});
