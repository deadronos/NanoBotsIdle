import { describe, expect, test } from "vitest";

import { SeededRng } from "./generation/rng";
import { computeBreakTime, isToolEffective, resolveDrops } from "./mining";
import { BlockId } from "./World";

describe("mining rules", () => {
  test("computeBreakTime scales with tool efficiency", () => {
    const handTime = computeBreakTime(BlockId.Stone, undefined);
    const toolTime = computeBreakTime(BlockId.Stone, "pick_wood");
    expect(handTime).toBeGreaterThan(toolTime);
    expect(toolTime).toBeGreaterThan(0);
  });

  test("isToolEffective respects tool tier requirements", () => {
    expect(isToolEffective(BlockId.IronOre, "pick_wood")).toBe(false);
    expect(isToolEffective(BlockId.IronOre, "pick_stone")).toBe(true);
  });

  test("resolveDrops returns default drops and enforces tool gating", () => {
    const rngDefault = new SeededRng(1);
    const dirtDrops = resolveDrops(BlockId.Dirt, undefined, rngDefault);
    expect(dirtDrops).toEqual([{ itemId: BlockId.Dirt, count: 1 }]);

    const rngOre = new SeededRng(7);
    const ironDrops = resolveDrops(BlockId.IronOre, "pick_stone", rngOre);
    expect(ironDrops).toEqual([{ itemId: BlockId.IronOre, count: 1 }]);

    const rngBlocked = new SeededRng(7);
    const blockedDrops = resolveDrops(BlockId.IronOre, undefined, rngBlocked);
    expect(blockedDrops).toEqual([]);
  });
});
