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

describe("Save Migration Edge Cases", () => {
  describe("Empty and minimal data", () => {
    it("should handle completely empty v1 data object", () => {
      const emptySave = loadFixture("edge-case-empty-v1.json") as SaveData;

      // Structure should be valid
      const structureResult = validateSaveStructure(emptySave);
      expect(structureResult.valid).toBe(true);

      // Apply migration
      const migrations = getMigrationsPath(emptySave.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(emptySave.data, migrations);

      // Validate migrated data
      const stateResult = validateGameState(migratedData as Partial<typeof emptySave.data>);
      expect(stateResult.valid).toBe(true);

      // Sanitize should fill in all defaults
      const sanitized = sanitizeGameState(migratedData as Partial<typeof emptySave.data>);
      expect(sanitized.credits).toBe(0);
      expect(sanitized.prestigeLevel).toBe(1);
      expect(sanitized.droneCount).toBe(3);
      expect(sanitized.totalBlocks).toBe(0);
    });

    it("should handle v2 save with only required fields", () => {
      const minimalV2 = loadFixture("backward-compat-v2-missing-optional.json") as SaveData;

      const structureResult = validateSaveStructure(minimalV2);
      expect(structureResult.valid).toBe(true);

      const stateResult = validateGameState(minimalV2.data);
      expect(stateResult.valid).toBe(true);

      const sanitized = sanitizeGameState(minimalV2.data);
      expect(sanitized.credits).toBe(2500);
      expect(sanitized.prestigeLevel).toBe(2);
      expect(sanitized.droneCount).toBe(6);
      // Optional fields should get defaults
      expect(sanitized.miningSpeedLevel).toBe(1);
      expect(sanitized.moveSpeedLevel).toBe(1);
      expect(sanitized.laserPowerLevel).toBe(1);
      expect(sanitized.minedBlocks).toBe(0);
      expect(sanitized.totalBlocks).toBe(0);
    });
  });

  describe("Extreme and negative values", () => {
    it("should handle extreme positive values", () => {
      const extremeSave = loadFixture("edge-case-extreme-values-v2.json") as SaveData;

      const structureResult = validateSaveStructure(extremeSave);
      expect(structureResult.valid).toBe(true);

      const stateResult = validateGameState(extremeSave.data);
      expect(stateResult.valid).toBe(true);

      const sanitized = sanitizeGameState(extremeSave.data);
      // Large values should be preserved (not clamped)
      expect(sanitized.credits).toBe(999999999);
      expect(sanitized.prestigeLevel).toBe(100);
      expect(sanitized.droneCount).toBe(1000);
    });

    it("should handle negative values with warnings and clamping", () => {
      const negativeSave = loadFixture("edge-case-negative-values-v1.json") as SaveData;

      const structureResult = validateSaveStructure(negativeSave);
      expect(structureResult.valid).toBe(true);

      // Apply migration
      const migrations = getMigrationsPath(negativeSave.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(negativeSave.data, migrations);

      // Validate should produce warnings
      const stateResult = validateGameState(migratedData as Partial<typeof negativeSave.data>);
      expect(stateResult.valid).toBe(true);
      expect(stateResult.warnings.length).toBeGreaterThan(0);
      expect(stateResult.warnings.some((w) => w.includes("negative"))).toBe(true);

      // Sanitize should clamp to valid ranges
      const sanitized = sanitizeGameState(migratedData as Partial<typeof negativeSave.data>);
      expect(sanitized.credits).toBe(0); // Clamped from -100
      expect(sanitized.prestigeLevel).toBe(1); // Clamped from 0
      expect(sanitized.droneCount).toBe(1); // Clamped from -5
      expect(sanitized.miningSpeedLevel).toBe(1); // Clamped from 0
      expect(sanitized.moveSpeedLevel).toBe(1); // Clamped from -1
      expect(sanitized.laserPowerLevel).toBe(1); // Clamped from 0
      expect(sanitized.minedBlocks).toBe(0); // Clamped from -50
    });
  });

  describe("Invalid type handling", () => {
    it("should reject save with invalid field types", () => {
      const invalidSave = loadFixture("invalid-bad-types.json");

      const structureResult = validateSaveStructure(invalidSave);
      expect(structureResult.valid).toBe(true); // Structure itself is valid

      // Type validation should fail
      const saveData = invalidSave as SaveData;
      const stateResult = validateGameState(saveData.data);
      expect(stateResult.valid).toBe(false);
      expect(stateResult.errors.length).toBeGreaterThan(0);

      // Should have errors for each invalid field type
      expect(stateResult.errors.some((e) => e.includes("credits"))).toBe(true);
      expect(stateResult.errors.some((e) => e.includes("prestigeLevel"))).toBe(true);
      expect(stateResult.errors.some((e) => e.includes("droneCount"))).toBe(true);
    });
  });

  describe("Forward compatibility - future version saves", () => {
    it("should handle v3 save with unknown fields gracefully", () => {
      const futureV3 = loadFixture("future-v3-with-unknown-fields.json") as SaveData;

      // Structure validation should warn about future version
      const structureResult = validateSaveStructure(futureV3);
      expect(structureResult.errors).toHaveLength(0);
      expect(structureResult.warnings.some((w) => w.includes("newer than this app"))).toBe(true);

      // Validate game state - should warn about unknown fields
      const stateResult = validateGameState(futureV3.data);
      expect(stateResult.valid).toBe(true);
      expect(stateResult.warnings.some((w) => w.includes("unknown fields"))).toBe(true);
      expect(stateResult.warnings.some((w) => w.includes("newFeatureInV3"))).toBe(true);
      expect(stateResult.warnings.some((w) => w.includes("anotherNewField"))).toBe(true);

      // Sanitize should preserve known fields and ignore unknown ones
      const sanitized = sanitizeGameState(futureV3.data);
      expect(sanitized.credits).toBe(5000);
      expect(sanitized.prestigeLevel).toBe(4);
      expect(sanitized.droneCount).toBe(12);
      expect(sanitized.totalBlocks).toBe(1500);

      // Unknown fields should not be in the sanitized output
      expect((sanitized as Record<string, unknown>).newFeatureInV3).toBeUndefined();
      expect((sanitized as Record<string, unknown>).anotherNewField).toBeUndefined();
    });

    it("should handle v10 save from distant future with minimal known data", () => {
      const futureV10 = loadFixture("future-v10-minimal.json") as SaveData;

      // Structure validation should warn
      const structureResult = validateSaveStructure(futureV10);
      expect(structureResult.warnings.some((w) => w.includes("newer than this app"))).toBe(true);

      // Game state validation should warn about unknown fields
      const stateResult = validateGameState(futureV10.data);
      expect(stateResult.valid).toBe(true);
      expect(stateResult.warnings.some((w) => w.includes("unknown fields"))).toBe(true);

      // Sanitize should preserve credits and apply defaults for missing fields
      const sanitized = sanitizeGameState(futureV10.data);
      expect(sanitized.credits).toBe(1000000);
      expect(sanitized.prestigeLevel).toBe(1); // Default
      expect(sanitized.droneCount).toBe(3); // Default
    });
  });

  describe("Backward compatibility - old version migrations", () => {
    it("should successfully migrate from v1 with negative values", () => {
      const v1Negative = loadFixture("edge-case-negative-values-v1.json") as SaveData;

      const migrations = getMigrationsPath(v1Negative.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(v1Negative.data, migrations);

      // After migration, sanitization should fix invalid values
      const sanitized = sanitizeGameState(migratedData as Partial<typeof v1Negative.data>);
      expect(sanitized.credits).toBeGreaterThanOrEqual(0);
      expect(sanitized.prestigeLevel).toBeGreaterThanOrEqual(1);
      expect(sanitized.droneCount).toBeGreaterThanOrEqual(1);
      expect(sanitized.totalBlocks).toBe(0); // Added in v2
    });

    it("should migrate empty v1 to v2 with all defaults", () => {
      const emptyV1 = loadFixture("edge-case-empty-v1.json") as SaveData;

      const migrations = getMigrationsPath(emptyV1.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(emptyV1.data, migrations);
      const sanitized = sanitizeGameState(migratedData as Partial<typeof emptyV1.data>);

      // All fields should have appropriate defaults
      expect(sanitized.credits).toBe(0);
      expect(sanitized.prestigeLevel).toBe(1);
      expect(sanitized.droneCount).toBe(3);
      expect(sanitized.miningSpeedLevel).toBe(1);
      expect(sanitized.moveSpeedLevel).toBe(1);
      expect(sanitized.laserPowerLevel).toBe(1);
      expect(sanitized.minedBlocks).toBe(0);
      expect(sanitized.totalBlocks).toBe(0);
    });
  });

  describe("Roundtrip integrity", () => {
    it("should preserve data through export/import with extreme values", () => {
      const extremeSave = loadFixture("edge-case-extreme-values-v2.json") as SaveData;

      // Export
      const exported = JSON.stringify(extremeSave);

      // Import
      const reimported = JSON.parse(exported) as SaveData;

      // Validate
      const structureResult = validateSaveStructure(reimported);
      expect(structureResult.valid).toBe(true);

      const stateResult = validateGameState(reimported.data);
      expect(stateResult.valid).toBe(true);

      const sanitized = sanitizeGameState(reimported.data);

      // All values should be preserved exactly
      expect(sanitized.credits).toBe(extremeSave.data.credits);
      expect(sanitized.prestigeLevel).toBe(extremeSave.data.prestigeLevel);
      expect(sanitized.droneCount).toBe(extremeSave.data.droneCount);
      expect(sanitized.totalBlocks).toBe(extremeSave.data.totalBlocks);
    });

    it("should handle roundtrip with sanitization for negative values", () => {
      const negativeSave = loadFixture("edge-case-negative-values-v1.json") as SaveData;

      // Migrate to current version
      const migrations = getMigrationsPath(negativeSave.version, CURRENT_SAVE_VERSION);
      const migratedData = applyMigrations(negativeSave.data, migrations);

      // Sanitize
      const sanitized = sanitizeGameState(migratedData as Partial<typeof negativeSave.data>);

      // Create new save with sanitized data
      const newSave: SaveData = {
        version: CURRENT_SAVE_VERSION,
        date: new Date().toISOString(),
        data: sanitized,
      };

      // Validate the new save
      const structureResult = validateSaveStructure(newSave);
      expect(structureResult.valid).toBe(true);

      const stateResult = validateGameState(newSave.data);
      expect(stateResult.valid).toBe(true);
      expect(stateResult.warnings).toHaveLength(0); // No warnings after sanitization

      // All values should be valid
      expect(newSave.data.credits).toBeGreaterThanOrEqual(0);
      expect(newSave.data.prestigeLevel).toBeGreaterThanOrEqual(1);
      expect(newSave.data.droneCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Migration chain integrity", () => {
    it("should maintain data integrity through full migration chain", () => {
      const v1Save = loadFixture("valid-v1.json") as SaveData;
      const originalCredits = v1Save.data.credits;
      const originalPrestige = v1Save.data.prestigeLevel;

      // Apply all migrations to current version
      const migrations = getMigrationsPath(v1Save.version, CURRENT_SAVE_VERSION);

      // Each migration should preserve original data
      let currentData = v1Save.data;
      for (const migration of migrations) {
        currentData = applyMigrations(currentData, [migration]) as typeof v1Save.data;

        // Validate after each migration
        const stateResult = validateGameState(currentData);
        expect(stateResult.valid).toBe(true);

        // Original fields should be preserved
        expect(currentData.credits).toBe(originalCredits);
        expect(currentData.prestigeLevel).toBe(originalPrestige);
      }

      // Final result should match
      const sanitized = sanitizeGameState(currentData);
      expect(sanitized.credits).toBe(originalCredits);
      expect(sanitized.prestigeLevel).toBe(originalPrestige);
    });

    it("should handle missing migration path gracefully", () => {
      // Try to migrate from a version that doesn't have a migration path
      // Version 99 is higher than current, so it's a downgrade attempt
      expect(() => {
        getMigrationsPath(99, CURRENT_SAVE_VERSION);
      }).toThrow("Cannot downgrade");
    });

    it("should reject downgrade attempts", () => {
      expect(() => {
        getMigrationsPath(CURRENT_SAVE_VERSION, 1);
      }).toThrow("Cannot downgrade");
    });
  });
});
