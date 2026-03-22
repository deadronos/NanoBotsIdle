import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";

import { getConfig } from "./config/index";
import { getUpgradeCost } from "./economy/upgrades";

export interface GameState {
  credits: number;
  prestigeLevel: number;

  // Upgrades
  droneCount: number;
  haulerCount: number;
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
  buyUpgrade: (type: "drone" | "hauler" | "speed" | "move" | "laser") => void;
  resetPrestige: () => void;
  getUpgradeCost: (type: "drone" | "hauler" | "speed" | "move" | "laser") => number;
}

// Legacy defaults remain in config (see src/config/economy.ts)

let pendingPersistWrite: ReturnType<typeof setTimeout> | undefined;

const clearPendingPersistWrite = () => {
  if (!pendingPersistWrite) return;
  clearTimeout(pendingPersistWrite);
  pendingPersistWrite = undefined;
};

// Toggle used to temporarily suppress persistence during critical operations (e.g., reset)
export let allowPersist = true;
export const setAllowPersist = (v: boolean) => {
  allowPersist = v;
  if (!v) {
    clearPendingPersistWrite();
  }
};

interface DebouncedStorage extends PersistStorage<GameState> {
  _timeout?: ReturnType<typeof setTimeout>;
}

const debouncedStorage: DebouncedStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (!allowPersist) {
      clearPendingPersistWrite();
      return;
    }
    clearPendingPersistWrite();
    pendingPersistWrite = setTimeout(() => {
      localStorage.setItem(name, JSON.stringify(value));
      pendingPersistWrite = undefined;
    }, 1000);
  },
  removeItem: (name) => {
    clearPendingPersistWrite();
    localStorage.removeItem(name);
  },
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
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
      storage: debouncedStorage as unknown as PersistStorage<Partial<GameState>>,
      version: 2,
      // Persistence suppression is handled by the storage adapter, which also clears queued
      // writes when `allowPersist` is disabled during reset.
      partialize: (state) => state,
    },
  ),
);
