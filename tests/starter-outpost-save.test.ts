import { expect, test } from "vitest";

import { createEngine } from "../src/engine/engine";

test("replaces the legacy starter outpost and preserves built outposts across reloads", () => {
  const original = createEngine(undefined, {
    outposts: [
      { id: "outpost-legacy", x: 0, y: 10, z: 0, level: 1 },
      { id: "outpost-built", x: 13, y: 7, z: 14, level: 1 },
    ],
  }).tick(0, 8, 1);

  expect(original.ui.landingSpawn).toBeDefined();
  expect(original.delta.outposts).toEqual([
    expect.objectContaining({ id: "starter-outpost" }),
    expect.objectContaining({ x: 13, y: 7, z: 14 }),
  ]);

  const reloaded = createEngine(undefined, { outposts: original.delta.outposts }).tick(0, 8, 1);
  expect(reloaded.delta.outposts).toHaveLength(2);
  expect(reloaded.ui.landingSpawn).toEqual(original.ui.landingSpawn);
});

test("prestige publishes the new world's spawn and starter outpost together", () => {
  const engine = createEngine(undefined, { minedBlocks: 100_000 });
  const initial = engine.tick(0, 8, 1);
  const oldSpawn = initial.ui.landingSpawn;
  const oldSeed = initial.ui.actualSeed;
  engine.dispatch({ t: "PRESTIGE" });

  const next = engine.tick(0, 8, 1);
  expect(next.ui.prestigeLevel).toBe(2);
  expect(next.ui.actualSeed).not.toBe(oldSeed);
  expect(next.ui.landingSpawn).not.toBe(oldSpawn);
  expect(next.delta.frontierReset).toBe(true);
  expect(next.delta.outposts?.[0].id).toBe("starter-outpost");
  expect(next.ui.landingSpawn!.z - next.delta.outposts![0].z).toBe(5);
});
