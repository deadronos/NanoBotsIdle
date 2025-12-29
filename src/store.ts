import { create } from "zustand";
import { persist } from "zustand/middleware";

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

import { getConfig } from "./config/index";

// Legacy defaults remain in config (see src/config/economy.ts)

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
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
        const cfg = getConfig();
        const baseCosts = cfg.economy?.baseCosts ?? { drone: 100, speed: 50, move: 50, laser: 200 };
        switch (type) {
          case "drone":
            return Math.floor(baseCosts.drone * Math.pow(1.5, state.droneCount - 3));
          case "speed":
            return Math.floor(baseCosts.speed * Math.pow(1.3, state.miningSpeedLevel - 1));
          case "move":
            return Math.floor(baseCosts.move * Math.pow(1.3, state.moveSpeedLevel - 1));
          case "laser":
            return Math.floor(baseCosts.laser * Math.pow(1.4, state.laserPowerLevel - 1));
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
    }),
    {
      name: "voxel-walker-storage",
      version: 1,
      // We can filter what to persist if needed, but for now persisting everything (except functions which persist doesn't save anyway) is fine.
    },
  ),
);
