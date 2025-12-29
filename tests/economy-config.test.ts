import { describe, it, expect } from "vitest";
import { updateConfig, resetConfig } from "../src/config/index";
import { useGameStore } from "../src/store";

describe("economy config integration (TDD)", () => {
  it("store.getUpgradeCost should reflect economy baseCosts override", () => {
    resetConfig();

    // default drone cost
    const defaultCost = useGameStore.getState().getUpgradeCost("drone");
    expect(defaultCost).toBeGreaterThan(0);

    // Override base cost and verify store picks it up
    updateConfig({ economy: { baseCosts: { drone: 333 } } });

    const newCost = useGameStore.getState().getUpgradeCost("drone");
    expect(newCost).toBe(Math.floor(333 * Math.pow(1.5, useGameStore.getState().droneCount - 3)));
  });
});
