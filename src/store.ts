import { create } from "zustand";

export interface GameState {
  credits: number;
  prestigeLevel: number;

  // Upgrades
  droneCount: number;
  miningSpeedLevel: number;
  moveSpeedLevel: number;
  laserPowerLevel: number;

  // World Stats
  minedBlocks: number;
  totalBlocks: number;

  // Actions
  addCredits: (amount: number) => void;
  incrementMinedBlocks: () => void;
  setTotalBlocks: (count: number) => void;
  buyUpgrade: (type: "drone" | "speed" | "move" | "laser") => void;
  resetPrestige: () => void;
  getUpgradeCost: (type: "drone" | "speed" | "move" | "laser") => number;
}

const BASE_COSTS = {
  drone: 100,
  speed: 50,
  move: 50,
  laser: 200,
};

export const useGameStore = create<GameState>((set, get) => ({
  credits: 0,
  prestigeLevel: 1,

  droneCount: 3,
  miningSpeedLevel: 1,
  moveSpeedLevel: 1,
  laserPowerLevel: 1,

  minedBlocks: 0,
  totalBlocks: 0,

  addCredits: (amount) => set((state) => ({ credits: state.credits + amount })),

  incrementMinedBlocks: () => set((state) => ({ minedBlocks: state.minedBlocks + 1 })),

  setTotalBlocks: (count) => set({ totalBlocks: count, minedBlocks: 0 }),

  resetPrestige: () =>
    set((state) => ({
      credits: 0,
      prestigeLevel: state.prestigeLevel + 1,
      minedBlocks: 0,
      // Keep upgrades? Usually prestige resets everything but gives a permanent multiplier.
      // For this game, let's keep upgrades but reset credits, giving a higher yield per block.
    })),

  getUpgradeCost: (type) => {
    const state = get();
    switch (type) {
      case "drone":
        return Math.floor(BASE_COSTS.drone * Math.pow(1.5, state.droneCount - 3));
      case "speed":
        return Math.floor(BASE_COSTS.speed * Math.pow(1.3, state.miningSpeedLevel - 1));
      case "move":
        return Math.floor(BASE_COSTS.move * Math.pow(1.3, state.moveSpeedLevel - 1));
      case "laser":
        return Math.floor(BASE_COSTS.laser * Math.pow(1.4, state.laserPowerLevel - 1));
    }
    return 999999;
  },

  buyUpgrade: (type) => {
    const state = get();
    const cost = state.getUpgradeCost(type);

    if (state.credits >= cost) {
      set((prev) => {
        const updates: Partial<GameState> = { credits: prev.credits - cost };
        if (type === "drone") updates.droneCount = prev.droneCount + 1;
        if (type === "speed") updates.miningSpeedLevel = prev.miningSpeedLevel + 1;
        if (type === "move") updates.moveSpeedLevel = prev.moveSpeedLevel + 1;
        if (type === "laser") updates.laserPowerLevel = prev.laserPowerLevel + 1;
        return updates;
      });
    }
  },
}));
