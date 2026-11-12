import { expect, test } from "vitest";

import { createEngine } from "../src/engine/engine";
import { WorldModel } from "../src/engine/world/world";
import { inMiningZone } from "../src/shared/miningOperations";
import { estimateOutpost } from "../src/ui/outpostPreview";

test("mining orders constrain newly assigned targets and can be cleared", () => {
  const engine = createEngine();
  const zone = { x: 3, y: 10, z: -4 };
  engine.dispatch({ t: "SET_MINING_ZONE", zone });
  const frame = engine.tick(0, 8, 1);
  expect(frame.ui.miningZone).toMatchObject({ x: zone.x, z: zone.z });
  const targets = frame.delta.entityTargets!;
  expect(targets.length).toBeGreaterThan(0);
  for (let i = 0; i < targets.length; i += 3) {
    expect(inMiningZone(zone, targets[i], targets[i + 2])).toBe(true);
  }
  engine.dispatch({ t: "CLEAR_MINING_ZONE" });
  expect(engine.tick(0, 8, 1).ui.miningZone).toBeUndefined();
});

test("the chosen prestige landing survives reload", () => {
  const engine = createEngine(undefined, { minedBlocks: 100_000 });
  engine.dispatch({ t: "PRESTIGE", landing: "rich" });
  const { ui } = engine.tick(0, 8, 1);
  expect(ui.prestigeLevel).toBe(2);
  expect(ui.landingProfile).toBe("rich");
  const restored = createEngine(undefined, ui).tick(0, 8, 1).ui;
  expect(restored.actualSeed).toBe(ui.actualSeed);
  expect(restored.landingSpawn).toEqual(ui.landingSpawn);
  const standard = createEngine(undefined, { prestigeLevel: 2 }).tick(0, 8, 1).ui;
  expect(standard.actualSeed).not.toBe(ui.actualSeed);
});

test("preview identifies the drone that would save distance on its return", () => {
  expect(
    estimateOutpost(
      { x: 9, y: 0, z: 0 },
      {
        tick: 0,
        entities: new Float32Array([10, 0, 0, 0, 0, 1]),
        outposts: [{ id: "starter", x: 0, y: 0, z: 0, level: 1 }],
      },
    ),
  ).toEqual({ diverted: 1, blocksSaved: 8, redirected: [0] });
});

test("expanding a partly visited chunk cannot resurrect a mined zone voxel", () => {
  const world = new WorldModel({ seed: 222 });
  world.initializeFrontierFromSurface(30);
  expect(world.mineVoxel(0, 6, 0)).not.toBeNull();
  const scan = world.ensureFrontierInChunk(0, 0);
  expect(scan).not.toContainEqual({ x: 0, y: 6, z: 0 });
  expect(world.getFrontierKeys()).not.toContain(world.key(0, 6, 0));
});
