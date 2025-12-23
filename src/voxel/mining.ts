import { SeededRng } from "./generation/rng";
import { BlockId, BLOCKS, type DropEntry } from "./World";
import { getToolDef, type ToolId } from "./tools";

export type ItemId = BlockId | ToolId;

export type ResolvedDrop = {
  itemId: ItemId;
  count: number;
};

const DEFAULT_HARDNESS = 1;
const BASE_BREAK_SECONDS = 0.75;
const INEFFECTIVE_MULTIPLIER = 3.5;
const MIN_BREAK_SECONDS = 0.15;

export function getBlockHardness(blockId: BlockId): number {
  const def = BLOCKS[blockId];
  if (!def) return DEFAULT_HARDNESS;
  if (def.breakable === false) return Number.POSITIVE_INFINITY;
  const hardness = def.hardness ?? DEFAULT_HARDNESS;
  if (!Number.isFinite(hardness)) return DEFAULT_HARDNESS;
  return Math.max(0, hardness);
}

export function isToolEffective(blockId: BlockId, toolId?: ToolId): boolean {
  const def = BLOCKS[blockId];
  if (!def) return false;

  const requiredType = def.requiredToolType;
  const requiredTier = def.requiredTier ?? 0;
  if (!requiredType) return true;

  const tool = getToolDef(toolId);
  if (!tool) return false;
  if (tool.toolType !== requiredType) return false;
  return tool.tier >= requiredTier;
}

export function computeBreakTime(blockId: BlockId, toolId?: ToolId): number {
  const def = BLOCKS[blockId];
  if (!def) return Number.POSITIVE_INFINITY;
  if (def.breakable === false) return Number.POSITIVE_INFINITY;

  const hardness = getBlockHardness(blockId);
  if (hardness <= 0) return 0;

  const tool = getToolDef(toolId);
  const base = BASE_BREAK_SECONDS * hardness;
  const efficiency = tool?.efficiency ?? 1;

  if (isToolEffective(blockId, toolId)) {
    return Math.max(MIN_BREAK_SECONDS, base / Math.max(0.1, efficiency));
  }

  return Math.max(MIN_BREAK_SECONDS, base * INEFFECTIVE_MULTIPLIER);
}

export function resolveDrops(
  blockId: BlockId,
  toolId: ToolId | undefined,
  rng: SeededRng,
): ResolvedDrop[] {
  const def = BLOCKS[blockId];
  if (!def) return [];
  if (def.breakable === false) return [];
  if (def.requiredToolType && !isToolEffective(blockId, toolId)) return [];

  const table = def.dropTable;
  if (!table || table.length === 0) {
    return [{ itemId: blockId, count: 1 }];
  }

  const drops: ResolvedDrop[] = [];
  for (const entry of table) {
    const normalized = normalizeDropEntry(entry);
    if (!normalized) continue;
    if (normalized.chance < 1 && rng.float() > normalized.chance) continue;
    const count = rng.int(normalized.min, normalized.max);
    if (count <= 0) continue;
    drops.push({ itemId: normalized.itemId as ItemId, count });
  }
  return drops;
}

function normalizeDropEntry(entry: DropEntry): DropEntry | null {
  if (!entry) return null;
  const min = Number.isFinite(entry.min) ? Math.floor(entry.min) : 0;
  const max = Number.isFinite(entry.max) ? Math.floor(entry.max) : min;
  const low = Math.max(0, Math.min(min, max));
  const high = Math.max(0, Math.max(min, max));
  const chance = Number.isFinite(entry.chance) ? Math.min(1, Math.max(0, entry.chance)) : 1;
  return { ...entry, min: low, max: high, chance };
}
