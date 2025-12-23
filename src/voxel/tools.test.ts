import { describe, expect, test } from "vitest";

import { applyToolDamage, createToolStack, getToolDef } from "./tools";

describe("tool durability", () => {
  test("applies durability damage", () => {
    const def = getToolDef("pick_wood");
    expect(def).toBeTruthy();
    if (!def) return;
    const stack = createToolStack(def, 1);
    const next = applyToolDamage(stack, def, 2);
    expect(next?.durability).toBe(def.durability - 2);
    expect(next?.count).toBe(1);
  });

  test("removes tool when durability hits zero", () => {
    const def = getToolDef("pick_wood");
    expect(def).toBeTruthy();
    if (!def) return;
    const stack = { count: 1, durability: 1 };
    const next = applyToolDamage(stack, def, 1);
    expect(next).toBeNull();
  });

  test("decrements stack and resets durability", () => {
    const def = getToolDef("pick_wood");
    expect(def).toBeTruthy();
    if (!def) return;
    const stack = { count: 2, durability: 1 };
    const next = applyToolDamage(stack, def, 1);
    expect(next?.count).toBe(1);
    expect(next?.durability).toBe(def.durability);
  });
});
