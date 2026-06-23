import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";

import { getConfig } from "./config/index";
import { getUpgradeCost, isUpgradeMaxed } from "./economy/upgrades";

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

/**
 * Persistence suppression is used to short-circuit storage writes during
 * critical operations like `resetGame`, where a queued debounced write could
 * resurrect cleared state immediately before the page reloads. The flag is
 * intentionally not part of `GameState` so it cannot leak through persistence
 * or React subscriptions - consumers must go through the explicit
 * `pausePersist`/`resumePersist` API below.
 */
type PersistGuard = { paused: boolean };
const persistGuard: PersistGuard = { paused: false };

let pendingPersistWrite: ReturnType<typeof setTimeout> | undefined;

const clearPendingPersistWrite = () => {
  if (!pendingPersistWrite) return;
  clearTimeout(pendingPersistWrite);
  pendingPersistWrite = undefined;
};

/**
 * Temporarily suspend writes to localStorage and discard any in-flight
 * debounced write. Calls to `pausePersist`/`resumePersist` must be paired by
 * the caller; the storage adapter does not auto-resume.
 */
export const pausePersist = (): void => {
  persistGuard.paused = true;
  clearPendingPersistWrite();
};

/** Re-enable persistence writes after a `pausePersist`. */
export const resumePersist = (): void => {
  persistGuard.paused = false;
};

/** @internal Test-only helper. Not intended for production callers. */
export const isPersistPaused = (): boolean => persistGuard.paused;

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
    if (persistGuard.paused) {
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
        const cfg = getConfig();
        if (isUpgradeMaxed(type, state, cfg)) return;
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
      // Persistence suppression is handled by the storage adapter via
      // `pausePersist`/`resumePersist`, which also clears any queued write.
      partialize: (state) => state,
    },
  ),
);
