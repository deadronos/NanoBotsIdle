import { create } from "zustand";

import { BLOCK_ID_LIST, BlockId } from "../voxel/World";
import {
  DEFAULT_TOOL_ID,
  ToolId,
  type ToolStack,
  applyToolDamage,
  createToolStack,
  getToolDef,
} from "../voxel/tools";
import type { Recipe } from "./recipes";

export type Vec3 = { x: number; y: number; z: number };

export type GameStats = {
  fps: number;
  position: Vec3;
  chunkCount: number;
  timeOfDay: number;
};

export type MiningState = {
  active: boolean;
  progress: number;
  blockId: BlockId | null;
};

export type GameStore = {
  pointerLocked: boolean;
  requestPointerLock?: () => void;
  atlasUrl?: string;
  uiOpen: boolean;
  hotbar: BlockId[];
  selectedSlot: number;
  inventory: Record<number, number>;
  tools: Partial<Record<ToolId, ToolStack>>;
  equippedToolId?: ToolId;
  mining: MiningState;
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
  addTool: (id: ToolId, count?: number) => void;
  equipTool: (id?: ToolId) => void;
  applyToolDurability: (id: ToolId, amount?: number) => void;
  setMining: (partial: Partial<MiningState>) => void;
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
  [BlockId.Torch]: 0,
};

const seededTools: Partial<Record<ToolId, ToolStack>> = {};
const defaultToolDef = getToolDef(DEFAULT_TOOL_ID);
if (defaultToolDef) {
  seededTools[defaultToolDef.id] = createToolStack(defaultToolDef, 1);
}
const defaultEquippedToolId = defaultToolDef?.id;

const defaultHotbar: BlockId[] = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Wood,
  BlockId.Sand,
  BlockId.Planks,
  BlockId.Glass,
  BlockId.Brick,
  BlockId.Leaves,
];

export const useGameStore = create<GameStore>((set, get) => ({
  pointerLocked: false,
  requestPointerLock: undefined,
  atlasUrl: undefined,
  uiOpen: false,
  hotbar: defaultHotbar,
  selectedSlot: 0,
  inventory: seededInventory,
  tools: seededTools,
  equippedToolId: defaultEquippedToolId,
  mining: { active: false, progress: 0, blockId: null },
  stats: {
    fps: 0,
    position: { x: 0, y: 0, z: 0 },
    chunkCount: 0,
    timeOfDay: 0,
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
  addTool: (id, count = 1) => {
    const def = getToolDef(id);
    if (!def) return;
    const tools = { ...get().tools };
    const existing = tools[id];
    if (existing) {
      tools[id] = {
        count: existing.count + Math.max(0, Math.floor(count)),
        durability: existing.durability,
      };
    } else {
      tools[id] = createToolStack(def, count);
    }
    set({ tools });
  },
  equipTool: (id) => {
    if (!id) {
      set({ equippedToolId: undefined });
      return;
    }
    const tools = get().tools;
    if (!tools[id]) return;
    set({ equippedToolId: id });
  },
  applyToolDurability: (id, amount = 1) => {
    const def = getToolDef(id);
    if (!def) return;
    const tools = { ...get().tools };
    const existing = tools[id];
    if (!existing) return;
    const next = applyToolDamage(existing, def, amount);
    if (!next) {
      delete tools[id];
      const equipped = get().equippedToolId === id ? undefined : get().equippedToolId;
      set({ tools, equippedToolId: equipped });
      return;
    }
    tools[id] = next;
    set({ tools });
  },
  setMining: (partial) => set({ mining: { ...get().mining, ...partial } }),
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
  setTargetBlock: (id) => set({ targetBlock: id }),
}));
