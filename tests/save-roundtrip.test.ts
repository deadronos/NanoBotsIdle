import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { applyMigrations, getMigrationsPath } from "../src/utils/migrations/registry";
import type { SaveData } from "../src/utils/migrations/types";
import { CURRENT_SAVE_VERSION } from "../src/utils/migrations/types";
import {
  sanitizeGameState,
  validateGameState,
  validateSaveStructure,
} from "../src/utils/migrations/validation";

const fixturesDir = path.join(__dirname, "fixtures", "saves");

function loadFixture(filename: string): unknown {
  const filePath = path.join(fixturesDir, filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

describe("Save Roundtrip Tests", () => {
  describe("Valid v2 save roundtrip", () => {
    it("should successfully load and validate current version save", () => {
      const saveData = loadFixture("valid-v2.json") as SaveData;

      // Validate structure
      const structureResult = validateSaveStructure(saveData);
      expect(structureResult.valid).toBe(true);

      // Validate game state
      const stateResult = validateGameState(saveData.data);
      expect(stateResult.valid).toBe(true);

      // Sanitize (should be no-op for valid data)
      const sanitized = sanitizeGameState(saveData.data);
      expect(sanitized.credits).toBe(3000);
      expect(sanitized.prestigeLevel).toBe(3);
      expect(sanitized.totalBlocks).toBe(1000);
    });

    it("should export and reimport current version without data loss", () => {
      const original = loadFixture("valid-v2.json") as SaveData;

      // Simulate export/import cycle
      const exported = JSON.stringify(original);
      const reimported = JSON.parse(exported) as SaveData;

      expect(reimported).toEqual(original);
    });
  });

  describe("V1 to V2 migration roundtrip", () => {
    it("should migrate valid v1 save to v2", () => {
      const v1Save = loadFixture("valid-v1.json") as SaveData;

      // Validate v1 structure
      const structureResult = validateSaveStructure(v1Save);
      expect(structureResult.valid).toBe(true);

      // Apply migration
      const migrations = getMigrationsPath(v1Save.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(v1Save.data, migrations);

      // Validate migrated data
      const stateResult = validateGameState(migratedData);
      expect(stateResult.valid).toBe(true);

      // Sanitize and verify
      const sanitized = sanitizeGameState(migratedData);
      expect(sanitized.credits).toBe(1500);
      expect(sanitized.prestigeLevel).toBe(2);
      expect(sanitized.droneCount).toBe(5);
      expect(sanitized.totalBlocks).toBe(0); // Added in v2
    });

    it("should handle minimal v1 save with defaults", () => {
      const minimalV1 = loadFixture("minimal-v1.json") as SaveData;

      const migrations = getMigrationsPath(minimalV1.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(minimalV1.data, migrations);

      const sanitized = sanitizeGameState(migratedData);

      // Verify defaults were applied
      expect(sanitized.credits).toBe(0);
      expect(sanitized.prestigeLevel).toBe(1);
      expect(sanitized.droneCount).toBe(3);
      expect(sanitized.miningSpeedLevel).toBe(1);
      expect(sanitized.totalBlocks).toBe(0);
    });
  });

  describe("Invalid save files", () => {
    it("should reject save without version field", () => {
      const invalidSave = loadFixture("invalid-no-version.json");
      const result = validateSaveStructure(invalidSave);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("should reject save without data field", () => {
      const invalidSave = loadFixture("invalid-no-data.json");
      const result = validateSaveStructure(invalidSave);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("data"))).toBe(true);
    });

    it("should warn about future version but accept structure", () => {
      const futureSave = loadFixture("future-version.json") as SaveData;
      const result = validateSaveStructure(futureSave);

      // Structure should be valid
      expect(result.errors).toHaveLength(0);

      // But should have warning
      expect(result.warnings.some((w) => w.includes("newer than this app"))).toBe(true);

      // Can still sanitize the data
      const sanitized = sanitizeGameState(futureSave.data);
      expect(sanitized.credits).toBe(10000);
    });
  });

  describe("Data integrity across migrations", () => {
    it("should preserve all v1 fields during migration to v2", () => {
      const v1Save = loadFixture("valid-v1.json") as SaveData;
      const originalData = v1Save.data;

      const migrations = getMigrationsPath(v1Save.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(v1Save.data, migrations);
      const sanitized = sanitizeGameState(migratedData);

      // All original fields should be preserved
      expect(sanitized.credits).toBe(originalData.credits);
      expect(sanitized.prestigeLevel).toBe(originalData.prestigeLevel);
      expect(sanitized.droneCount).toBe(originalData.droneCount);
      expect(sanitized.miningSpeedLevel).toBe(originalData.miningSpeedLevel);
      expect(sanitized.moveSpeedLevel).toBe(originalData.moveSpeedLevel);
      expect(sanitized.laserPowerLevel).toBe(originalData.laserPowerLevel);
      expect(sanitized.minedBlocks).toBe(originalData.minedBlocks);
    });

    it("should handle edge case values correctly", () => {
      const edgeCaseV1 = {
        version: 1,
        date: "2024-01-01",
        data: {
          credits: 0,
          prestigeLevel: 1,
          droneCount: 1,
          miningSpeedLevel: 1,
          moveSpeedLevel: 1,
          laserPowerLevel: 1,
          minedBlocks: 0,
        },
      } as SaveData;

      const migrations = getMigrationsPath(edgeCaseV1.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(edgeCaseV1.data, migrations);
      const sanitized = sanitizeGameState(migratedData);

      // All minimum values should be preserved
      expect(sanitized.credits).toBe(0);
      expect(sanitized.prestigeLevel).toBe(1);
      expect(sanitized.droneCount).toBe(1);
      expect(sanitized.totalBlocks).toBe(0);
    });
  });
});
