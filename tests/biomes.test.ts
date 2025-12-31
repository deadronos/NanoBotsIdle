import { expect, test } from "vitest";

import { getBiomeAt } from "../src/sim/biomes";

test("getBiomeAt deterministic for same seed/coords", () => {
  const a = getBiomeAt(10, 20, 42, 5, -12);
  const b = getBiomeAt(10, 20, 42, 5, -12);
  expect(a).toEqual(b);
});

test("getBiomeAt outputs bounded heat/moisture", () => {
  const s = getBiomeAt(-123, 456, 99, 10, -12);
  expect(s.heat01).toBeGreaterThanOrEqual(0);
  expect(s.heat01).toBeLessThanOrEqual(1);
  expect(s.moisture01).toBeGreaterThanOrEqual(0);
  expect(s.moisture01).toBeLessThanOrEqual(1);
});

test("getBiomeAt returns a declared biome id", () => {
  const s = getBiomeAt(0, 0, 1, 0, -12);
  expect([
    "ocean",
    "beach",
    "grassland",
    "forest",
    "desert",
    "tundra",
    "mountain",
    "snow",
  ]).toContain(s.id);
});
