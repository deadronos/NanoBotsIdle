import { describe, expect, it } from "vitest";
import { getUpgradeCost, tryBuyUpgrade, computeNextUpgradeCosts } from "../src/economy/upgrades";
import { Config, getConfig, resetConfig } from "../src/config";
import type { UiSnapshot } from "../src/shared/protocol";

// Helper to create a basic snapshot
const createSnapshot = (): UiSnapshot => ({
  credits: 10000,
  prestigeLevel: 1,
  droneCount: 3,
  haulerCount: 0,
  miningSpeedLevel: 1,
  moveSpeedLevel: 1,
  laserPowerLevel: 1,
  minedBlocks: 0,
  totalBlocks: 0,
  outposts: []
});

describe("economy/upgrades", () => {
  // Use getConfig() instead of relying on an export that doesn't exist or is undefined
  const config = getConfig();

  describe("getUpgradeCost", () => {
    it("should calculate drone cost correctly", () => {
      // baseCosts.drone is 100
      // 3 drones: 100 * 1.5^(3-3) = 100
      let snapshot = createSnapshot();
      expect(getUpgradeCost("drone", snapshot, config)).toBe(100);

      // 4 drones: 100 * 1.5^(4-3) = 150
      snapshot.droneCount = 4;
      expect(getUpgradeCost("drone", snapshot, config)).toBe(150);
    });

    it("should calculate hauler cost correctly", () => {
      // baseCosts.hauler is 500 (from defaultEconomyConfig)
      // 0 haulers: 500 * 1.5^0 = 500
      let snapshot = createSnapshot();
      expect(getUpgradeCost("hauler", snapshot, config)).toBe(500);

      // 1 hauler: 500 * 1.5^1 = 750
      snapshot.haulerCount = 1;
      expect(getUpgradeCost("hauler", snapshot, config)).toBe(750);
    });

    it("should calculate speed cost correctly", () => {
      // baseCosts.speed is 50 (from defaultEconomyConfig)
      // level 1: 50 * 1.3^(1-1) = 50
      let snapshot = createSnapshot();
      expect(getUpgradeCost("speed", snapshot, config)).toBe(50);

      // level 2: 50 * 1.3^1 = 65
      snapshot.miningSpeedLevel = 2;
      expect(getUpgradeCost("speed", snapshot, config)).toBe(65);
    });

    it("should calculate move cost correctly", () => {
      // baseCosts.move is 50 (from defaultEconomyConfig)
      // level 1: 50 * 1.3^(1-1) = 50
      let snapshot = createSnapshot();
      expect(getUpgradeCost("move", snapshot, config)).toBe(50);

      // level 2: 50 * 1.3^1 = 65
      snapshot.moveSpeedLevel = 2;
      expect(getUpgradeCost("move", snapshot, config)).toBe(65);
    });

    it("should calculate laser cost correctly", () => {
      // baseCosts.laser is 200 (from defaultEconomyConfig)
      // level 1: 200 * 1.4^(1-1) = 200
      let snapshot = createSnapshot();
      expect(getUpgradeCost("laser", snapshot, config)).toBe(200);

      // level 2: 200 * 1.4^1 = 280
      snapshot.laserPowerLevel = 2;
      expect(getUpgradeCost("laser", snapshot, config)).toBe(280);
    });
  });

  describe("tryBuyUpgrade", () => {
    it("should buy drone upgrade if enough credits", () => {
      const snapshot = createSnapshot();
      const cost = getUpgradeCost("drone", snapshot, config);
      snapshot.credits = cost + 50;

      const success = tryBuyUpgrade("drone", snapshot, config);
      expect(success).toBe(true);
      expect(snapshot.credits).toBe(50);
      expect(snapshot.droneCount).toBe(4);
    });

    it("should not buy drone upgrade if not enough credits", () => {
      const snapshot = createSnapshot();
      const cost = getUpgradeCost("drone", snapshot, config);
      snapshot.credits = cost - 1;

      const success = tryBuyUpgrade("drone", snapshot, config);
      expect(success).toBe(false);
      expect(snapshot.credits).toBe(cost - 1);
      expect(snapshot.droneCount).toBe(3);
    });

    it("should buy hauler upgrade", () => {
      const snapshot = createSnapshot();
      const cost = getUpgradeCost("hauler", snapshot, config);
      snapshot.credits = cost;

      expect(tryBuyUpgrade("hauler", snapshot, config)).toBe(true);
      expect(snapshot.credits).toBe(0);
      expect(snapshot.haulerCount).toBe(1);
    });

    it("should buy speed upgrade", () => {
      const snapshot = createSnapshot();
      const cost = getUpgradeCost("speed", snapshot, config);
      snapshot.credits = cost;

      expect(tryBuyUpgrade("speed", snapshot, config)).toBe(true);
      expect(snapshot.credits).toBe(0);
      expect(snapshot.miningSpeedLevel).toBe(2);
    });

    it("should buy move upgrade", () => {
      const snapshot = createSnapshot();
      const cost = getUpgradeCost("move", snapshot, config);
      snapshot.credits = cost;

      expect(tryBuyUpgrade("move", snapshot, config)).toBe(true);
      expect(snapshot.credits).toBe(0);
      expect(snapshot.moveSpeedLevel).toBe(2);
    });

    it("should buy laser upgrade", () => {
      const snapshot = createSnapshot();
      const cost = getUpgradeCost("laser", snapshot, config);
      snapshot.credits = cost;

      expect(tryBuyUpgrade("laser", snapshot, config)).toBe(true);
      expect(snapshot.credits).toBe(0);
      expect(snapshot.laserPowerLevel).toBe(2);
    });
  });

  describe("computeNextUpgradeCosts", () => {
    it("should return costs for all upgrades", () => {
      const snapshot = createSnapshot();
      const costs = computeNextUpgradeCosts(snapshot, config);

      expect(costs).toHaveProperty("drone");
      expect(costs).toHaveProperty("hauler");
      expect(costs).toHaveProperty("speed");
      expect(costs).toHaveProperty("move");
      expect(costs).toHaveProperty("laser");

      // Basic check
      expect(costs.drone).toBeGreaterThan(0);
    });
  });
});
