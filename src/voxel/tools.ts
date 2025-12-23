export type ToolType = "pickaxe" | "axe" | "shovel" | "hand";

export type ToolId = "pick_wood" | "pick_stone" | "pick_iron";

export type ToolDef = {
  id: ToolId;
  name: string;
  toolType: ToolType;
  tier: number;
  efficiency: number;
  durability: number;
};

export type ToolStack = {
  count: number;
  durability: number;
};

export const TOOL_DEFS: ToolDef[] = [
  {
    id: "pick_wood",
    name: "Wood Pickaxe",
    toolType: "pickaxe",
    tier: 1,
    efficiency: 1.6,
    durability: 60,
  },
  {
    id: "pick_stone",
    name: "Stone Pickaxe",
    toolType: "pickaxe",
    tier: 2,
    efficiency: 2.1,
    durability: 90,
  },
  {
    id: "pick_iron",
    name: "Iron Pickaxe",
    toolType: "pickaxe",
    tier: 3,
    efficiency: 2.8,
    durability: 150,
  },
];

export const TOOL_IDS = TOOL_DEFS.map((tool) => tool.id);
export const DEFAULT_TOOL_ID: ToolId = "pick_wood";

const TOOL_MAP = new Map<ToolId, ToolDef>(TOOL_DEFS.map((tool) => [tool.id, tool]));

export function getToolDef(id?: ToolId): ToolDef | undefined {
  if (!id) return undefined;
  return TOOL_MAP.get(id);
}

export function createToolStack(def: ToolDef, count = 1): ToolStack {
  return {
    count: Math.max(0, Math.floor(count)),
    durability: Math.max(1, Math.floor(def.durability)),
  };
}

export function applyToolDamage(stack: ToolStack, def: ToolDef, amount = 1): ToolStack | null {
  const count = Math.max(0, Math.floor(stack.count));
  if (count === 0) return null;

  const maxDurability = Math.max(1, Math.floor(def.durability));
  const current = Number.isFinite(stack.durability)
    ? Math.min(maxDurability, Math.floor(stack.durability))
    : maxDurability;

  const nextDurability = current - Math.max(1, Math.floor(amount));
  if (nextDurability > 0) {
    return { count, durability: nextDurability };
  }

  if (count <= 1) return null;
  return { count: count - 1, durability: maxDurability };
}
