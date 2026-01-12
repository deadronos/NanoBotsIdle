import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getConfig } from "./config/index";
import { getUpgradeCost } from "./economy/upgrades";

export interface GameState {
  credits: number;
  prestigeLevel: number;

  // Upgrades
  droneCount: number;
  haulerCount: number;
  diverCount: number;
  miningSpeedLevel: number;
  moveSpeedLevel: number;
  laserPowerLevel: number;

  // World Stats
  minedBlocks: number;
  totalBlocks: number;
  outposts: { id: string; x: number; y: number; z: number; level: number }[];

  // Actions
  addCredits: (amount: number) => void;
  incrementMinedBlocks: () => void;
  setTotalBlocks: (count: number) => void;
  buyUpgrade: (type: "drone" | "hauler" | "diver" | "speed" | "move" | "laser") => void;
  resetPrestige: () => void;
  getUpgradeCost: (type: "drone" | "hauler" | "diver" | "speed" | "move" | "laser") => number;
}

// Legacy defaults remain in config (see src/config/economy.ts)

// Toggle used to temporarily suppress persistence during critical operations (e.g., reset)
export let allowPersist = true;
export const setAllowPersist = (v: boolean) => {
  allowPersist = v;
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      credits: 0,
      prestigeLevel: 1,

      droneCount: 3,
      haulerCount: 0,
      diverCount: 0,
      miningSpeedLevel: 1,
      moveSpeedLevel: 1,
      laserPowerLevel: 1,

      minedBlocks: 0,
      totalBlocks: 0,
      outposts: [],

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
        return getUpgradeCost(type, state, cfg);
      },

      buyUpgrade: (type) => {
        const state = get();
        const cost = state.getUpgradeCost(type);

        if (state.credits >= cost) {
          set((prev) => {
            const updates: Partial<GameState> = { credits: prev.credits - cost };
            if (type === "drone") updates.droneCount = prev.droneCount + 1;
            if (type === "hauler") updates.haulerCount = prev.haulerCount + 1;
            if (type === "diver") updates.diverCount = prev.diverCount + 1;
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
      version: 2,
      // Suppress persistence when `allowPersist` is false. This protects against races where
      // the app writes to storage while a reset/remove is in progress.
      partialize: (state) => (allowPersist ? state : ({} as Partial<GameState>)),
    },
  ),
);
