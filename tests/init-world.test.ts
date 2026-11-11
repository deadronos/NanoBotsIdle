import { expect, test } from "vitest";

import { getConfig } from "../src/config/index";
import { initWorldForPrestige } from "../src/engine/world/initWorld";

test("initWorldForPrestige respects minimum above-water frontier when possible", () => {
  const cfg = getConfig();
  // Make a shallow copy and ensure the minBlocks is modest so the default seed should meet it
  const localCfg = {
    ...cfg,
    economy: { ...cfg.economy, prestigeMinMinedBlocks: 10 },
    terrain: { ...cfg.terrain },
  };

  const result = initWorldForPrestige(1, localCfg);
  expect(result.aboveWaterCount).toBeGreaterThanOrEqual(localCfg.economy.prestigeMinMinedBlocks);
});

test("initWorldForPrestige falls back to base seed if requirement cannot be met within retries", () => {
  const cfg = getConfig();
  // Set an impossibly high min so generation will not meet it
  const localCfg = {
    ...cfg,
    economy: { ...cfg.economy, prestigeMinMinedBlocks: 999999 },
    terrain: { ...cfg.terrain, genRetries: 2 },
  };

  const result = initWorldForPrestige(1, localCfg);
  // Should have used base seed as fallback when no candidate met the requirement
  const baseSeed = cfg.terrain.baseSeed + cfg.terrain.prestigeSeedDelta * 1;
  expect(result.actualSeed).toBe(baseSeed);
  // And clearly won't meet the impossibly high requirement
  expect(result.aboveWaterCount).toBeLessThan(localCfg.economy.prestigeMinMinedBlocks);
});

test("generates a deterministic above-water starter outpost and nearby player spawn", () => {
  const cfg = getConfig();
  const { world } = initWorldForPrestige(1, cfg);
  const { world: repeated } = initWorldForPrestige(1, cfg);
  const [outpost] = world.getOutposts();
  const spawn = world.landingSpawn;

  expect(outpost.id).toBe("starter-outpost");
  expect(outpost.y).toBeGreaterThan(cfg.terrain.waterLevel);
  expect(
    world.baseMaterialAt(Math.floor(outpost.x), outpost.y - 1, Math.floor(outpost.z)),
  ).not.toBe(0);
  expect(Math.hypot(spawn.x - outpost.x, spawn.z - outpost.z)).toBeGreaterThan(4);
  expect(spawn.y).toBeGreaterThan(cfg.terrain.waterLevel + cfg.player.playerHeight);
  expect(repeated.landingSpawn).toEqual(spawn);

  const foundation = world
    .getFrontierKeys()
    .map((key) => world.coordsFromKey(key))
    .find(({ x, y, z }) => y === outpost.y - 1 && world.isStarterFoundation(x, z));
  expect(foundation).toBeDefined();
  expect(world.mineVoxel(foundation!.x, foundation!.y, foundation!.z)).toBeNull();
});
