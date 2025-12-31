import { describe, expect, it } from "vitest";

import type { GameState } from "../src/store";
import {
  sanitizeGameState,
  validateGameState,
  validateSaveStructure,
} from "../src/utils/migrations/validation";

describe("Save Validation", () => {
  describe("validateSaveStructure", () => {
    it("should accept valid save structure", () => {
      const validSave = {
        version: 2,
        date: "2024-12-30T00:00:00Z",
        data: { credits: 100 },
      };

      const result = validateSaveStructure(validSave);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject non-object save", () => {
      const result = validateSaveStructure("not an object");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Save file must be a valid JSON object");
    });

    it("should reject save without version", () => {
      const result = validateSaveStructure({ data: {} });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("should reject save without data", () => {
      const result = validateSaveStructure({ version: 1, date: "2024-01-01" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("data"))).toBe(true);
    });

    it("should reject invalid version number", () => {
      const result = validateSaveStructure({
        version: 0,
        data: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid version"))).toBe(true);
    });

    it("should warn about future version", () => {
      const result = validateSaveStructure({
        version: 999,
        date: "2024-01-01",
        data: {},
      });
      expect(result.warnings.some((w) => w.includes("newer than this app"))).toBe(true);
    });

    it("should warn about missing date (non-critical)", () => {
      const result = validateSaveStructure({
        version: 1,
        data: {},
      });
      expect(result.warnings.some((w) => w.includes("date"))).toBe(true);
    });
  });

  describe("validateGameState", () => {
    it("should accept valid game state", () => {
      const state: Partial<GameState> = {
        credits: 1000,
        prestigeLevel: 2,
        droneCount: 5,
        miningSpeedLevel: 3,
        moveSpeedLevel: 2,
        laserPowerLevel: 4,
        minedBlocks: 100,
        totalBlocks: 500,
      };

      const result = validateGameState(state);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject non-numeric fields", () => {
      const state = {
        credits: "not a number" as unknown as number,
      };

      const result = validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("credits"))).toBe(true);
    });

    it("should reject NaN values", () => {
      const state = {
        credits: NaN,
      };

      const result = validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("finite number"))).toBe(true);
    });

    it("should reject Infinity values", () => {
      const state = {
        credits: Infinity,
      };

      const result = validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("finite number"))).toBe(true);
    });

    it("should warn about negative credits", () => {
      const state: Partial<GameState> = {
        credits: -100,
      };

      const result = validateGameState(state);
      expect(result.warnings.some((w) => w.includes("negative"))).toBe(true);
    });

    it("should warn about invalid prestige level", () => {
      const state: Partial<GameState> = {
        prestigeLevel: 0,
      };

      const result = validateGameState(state);
      expect(result.warnings.some((w) => w.includes("Prestige level"))).toBe(true);
    });

    it("should warn about invalid drone count", () => {
      const state: Partial<GameState> = {
        droneCount: 0,
      };

      const result = validateGameState(state);
      expect(result.warnings.some((w) => w.includes("Drone count"))).toBe(true);
    });
  });

  describe("sanitizeGameState", () => {
    it("should clamp negative credits to 0", () => {
      const state: Partial<GameState> = { credits: -100 };
      const result = sanitizeGameState(state);
      expect(result.credits).toBe(0);
    });

    it("should clamp prestige level to minimum 1", () => {
      const state: Partial<GameState> = { prestigeLevel: 0 };
      const result = sanitizeGameState(state);
      expect(result.prestigeLevel).toBe(1);
    });

    it("should clamp drone count to minimum 1", () => {
      const state: Partial<GameState> = { droneCount: 0 };
      const result = sanitizeGameState(state);
      expect(result.droneCount).toBe(1);
    });

    it("should provide defaults for undefined fields", () => {
      const state: Partial<GameState> = {};
      const result = sanitizeGameState(state);

      expect(result.credits).toBe(0);
      expect(result.prestigeLevel).toBe(1);
      expect(result.droneCount).toBe(3);
      expect(result.miningSpeedLevel).toBe(1);
      expect(result.moveSpeedLevel).toBe(1);
      expect(result.laserPowerLevel).toBe(1);
      expect(result.minedBlocks).toBe(0);
      expect(result.totalBlocks).toBe(0);
    });

    it("should preserve valid values", () => {
      const state: Partial<GameState> = {
        credits: 5000,
        prestigeLevel: 3,
        droneCount: 10,
      };
      const result = sanitizeGameState(state);

      expect(result.credits).toBe(5000);
      expect(result.prestigeLevel).toBe(3);
      expect(result.droneCount).toBe(10);
    });
  });
});
