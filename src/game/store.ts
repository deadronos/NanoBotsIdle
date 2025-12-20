import { create } from "zustand";
import { BlockId, BLOCK_ID_LIST } from "../voxel/World";
import type { Recipe } from "./recipes";

export type Vec3 = { x: number; y: number; z: number };

export type GameStats = {
  fps: number;
  position: Vec3;
  chunkCount: number;
  timeOfDay: number;
};

export type GameStore = {
  pointerLocked: boolean;
  requestPointerLock?: () => void;
  atlasUrl?: string;
  uiOpen: boolean;
  hotbar: BlockId[];
  selectedSlot: number;
  inventory: Record<number, number>;
  stats: GameStats;
  targetBlock: BlockId | null;
  setPointerLocked: (locked: boolean) => void;
  setRequestPointerLock: (fn?: () => void) => void;
  setAtlasUrl: (url: string) => void;
  setUiOpen: (open: boolean) => void;
  setSelectedSlot: (slot: number) => void;
  setHotbarSlot: (slot: number, id: BlockId) => void;
  addItem: (id: BlockId, count?: number) => void;
  consumeItem: (id: BlockId, count?: number) => boolean;
  craft: (recipe: Recipe) => boolean;
  setStats: (partial: Partial<GameStats>) => void;
  setTargetBlock: (id: BlockId | null) => void;
};

const emptyInventory: Record<number, number> = {};
for (const id of BLOCK_ID_LIST) {
  emptyInventory[id] = 0;
}

const seededInventory: Record<number, number> = {
  ...emptyInventory,
  [BlockId.Grass]: 24,
  [BlockId.Dirt]: 32,
  [BlockId.Stone]: 28,
  [BlockId.Sand]: 18,
  [BlockId.Wood]: 16,
  [BlockId.Leaves]: 12,
  [BlockId.Planks]: 0,
  [BlockId.Brick]: 0,
  [BlockId.Glass]: 0,
  [BlockId.Torch]: 0
};

const defaultHotbar: BlockId[] = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Wood,
  BlockId.Sand,
  BlockId.Planks,
  BlockId.Glass,
  BlockId.Brick,
  BlockId.Leaves
];

export const useGameStore = create<GameStore>((set, get) => ({
  pointerLocked: false,
  requestPointerLock: undefined,
  atlasUrl: undefined,
  uiOpen: false,
  hotbar: defaultHotbar,
  selectedSlot: 0,
  inventory: seededInventory,
  stats: {
    fps: 0,
    position: { x: 0, y: 0, z: 0 },
    chunkCount: 0,
    timeOfDay: 0
  },
  targetBlock: null,
  setPointerLocked: (locked) => set({ pointerLocked: locked }),
  setRequestPointerLock: (fn) => set({ requestPointerLock: fn }),
  setAtlasUrl: (url) => set({ atlasUrl: url }),
  setUiOpen: (open) => set({ uiOpen: open }),
  setSelectedSlot: (slot) => {
    const clamped = Math.max(0, Math.min(slot, get().hotbar.length - 1));
    set({ selectedSlot: clamped });
  },
  setHotbarSlot: (slot, id) => {
    const hotbar = [...get().hotbar];
    if (slot < 0 || slot >= hotbar.length) return;
    hotbar[slot] = id;
    set({ hotbar });
  },
  addItem: (id, count = 1) => {
    const inventory = { ...get().inventory };
    inventory[id] = (inventory[id] ?? 0) + count;
    set({ inventory });
  },
  consumeItem: (id, count = 1) => {
    const inventory = { ...get().inventory };
    const current = inventory[id] ?? 0;
    if (current < count) return false;
    inventory[id] = current - count;
    set({ inventory });
    return true;
  },
  craft: (recipe) => {
    const inventory = { ...get().inventory };
    for (const input of recipe.input) {
      if ((inventory[input.id] ?? 0) < input.count) return false;
    }
    for (const input of recipe.input) {
      inventory[input.id] -= input.count;
    }
    inventory[recipe.output.id] = (inventory[recipe.output.id] ?? 0) + recipe.output.count;
    set({ inventory });
    return true;
  },
  setStats: (partial) => set({ stats: { ...get().stats, ...partial } }),
  setTargetBlock: (id) => set({ targetBlock: id })
}));
