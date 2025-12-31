import { afterEach,beforeEach, describe, expect, it } from "vitest";

import { resetConfig, updateConfig } from "../src/config";
import { useGameStore } from "../src/store";

// Mock localStorage if not available (Vitest might be running in node environment)
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as Storage;
}

// Helper to reset the store state
const resetStore = () => {
  useGameStore.setState({
    credits: 0,
    prestigeLevel: 1,
    droneCount: 3,
    haulerCount: 0,
    miningSpeedLevel: 1,
    moveSpeedLevel: 1,
    laserPowerLevel: 1,
    minedBlocks: 0,
    totalBlocks: 0,
    outposts: [],
  }); // Default is merge, so we don't lose actions
  resetConfig();
};

describe("useGameStore", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it("should have correct initial state", () => {
    const state = useGameStore.getState();
    expect(state.credits).toBe(0);
    expect(state.prestigeLevel).toBe(1);
    expect(state.droneCount).toBe(3);
    expect(state.haulerCount).toBe(0);
    expect(state.minedBlocks).toBe(0);
    expect(typeof state.addCredits).toBe('function');
  });

  it("should add credits", () => {
    const state = useGameStore.getState();
    state.addCredits(100);
    expect(useGameStore.getState().credits).toBe(100);
    useGameStore.getState().addCredits(50);
    expect(useGameStore.getState().credits).toBe(150);
  });

  it("should increment mined blocks", () => {
    const state = useGameStore.getState();
    state.incrementMinedBlocks();
    expect(useGameStore.getState().minedBlocks).toBe(1);
    useGameStore.getState().incrementMinedBlocks();
    expect(useGameStore.getState().minedBlocks).toBe(2);
  });

  it("should set total blocks and reset mined blocks", () => {
    const state = useGameStore.getState();
    state.incrementMinedBlocks();
    expect(useGameStore.getState().minedBlocks).toBe(1);

    state.setTotalBlocks(1000);
    expect(useGameStore.getState().totalBlocks).toBe(1000);
    expect(useGameStore.getState().minedBlocks).toBe(0);
  });

  it("should reset prestige", () => {
    const state = useGameStore.getState();
    state.addCredits(500);
    state.incrementMinedBlocks();
    expect(useGameStore.getState().credits).toBe(500);
    expect(useGameStore.getState().prestigeLevel).toBe(1);

    state.resetPrestige();
    const newState = useGameStore.getState();
    expect(newState.credits).toBe(0);
    expect(newState.prestigeLevel).toBe(2);
    expect(newState.minedBlocks).toBe(0);
    // Upgrades should persist
    expect(newState.droneCount).toBe(3);
  });

  describe("buyUpgrade", () => {
    it("should buy drone upgrade if enough credits", () => {
      const state = useGameStore.getState();
      const cost = state.getUpgradeCost("drone");
      state.addCredits(cost + 10);

      state.buyUpgrade("drone");

      const newState = useGameStore.getState();
      expect(newState.credits).toBe(10);
      expect(newState.droneCount).toBe(4);
    });

    it("should buy hauler upgrade", () => {
      const state = useGameStore.getState();
      const cost = state.getUpgradeCost("hauler");
      state.addCredits(cost);

      state.buyUpgrade("hauler");

      const newState = useGameStore.getState();
      expect(newState.credits).toBe(0);
      expect(newState.haulerCount).toBe(1);
    });

    it("should buy mining speed upgrade", () => {
      const state = useGameStore.getState();
      const cost = state.getUpgradeCost("speed");
      state.addCredits(cost);

      state.buyUpgrade("speed");

      const newState = useGameStore.getState();
      expect(newState.credits).toBe(0);
      expect(newState.miningSpeedLevel).toBe(2);
    });

    it("should buy move speed upgrade", () => {
      const state = useGameStore.getState();
      const cost = state.getUpgradeCost("move");
      state.addCredits(cost);

      state.buyUpgrade("move");

      const newState = useGameStore.getState();
      expect(newState.credits).toBe(0);
      expect(newState.moveSpeedLevel).toBe(2);
    });

    it("should buy laser power upgrade", () => {
      const state = useGameStore.getState();
      const cost = state.getUpgradeCost("laser");
      state.addCredits(cost);

      state.buyUpgrade("laser");

      const newState = useGameStore.getState();
      expect(newState.credits).toBe(0);
      expect(newState.laserPowerLevel).toBe(2);
    });

    it("should not buy upgrade if insufficient credits", () => {
      const state = useGameStore.getState();
      const cost = state.getUpgradeCost("drone");
      state.addCredits(cost - 1);

      state.buyUpgrade("drone");

      const newState = useGameStore.getState();
      expect(newState.credits).toBe(cost - 1);
      expect(newState.droneCount).toBe(3);
    });
  });

  it("should calculate upgrade cost using getUpgradeCost", () => {
    const state = useGameStore.getState();
    // Default config values should be used
    const cost = state.getUpgradeCost("drone");
    expect(cost).toBeGreaterThan(0);

    // Check integration with config
    updateConfig({ economy: { baseCosts: { drone: 999 } } });
    const newCost = useGameStore.getState().getUpgradeCost("drone");
    // droneCount is 3, so cost is baseCost * 1.5^(3-3) = baseCost * 1 = 999
    expect(newCost).toBe(999);
  });
});
