import { describe, expect, it } from "vitest";

import { getConfig, resetConfig, updateConfig } from "../src/config/index";
import { MATERIAL_AIR, MATERIAL_BEDROCK, MATERIAL_SOLID, WorldModel } from "../src/engine/world/world";
import { getSeed, getSurfaceHeight } from "../src/sim/terrain";

describe("world model (v1)", () => {
  it("returns bedrock below the configured bedrockY", () => {
    resetConfig();
    updateConfig({ terrain: { bedrockY: -5 } });
    const seed = getSeed(1);
    const world = new WorldModel({ seed });
    expect(world.baseMaterialAt(0, -10, 0)).toBe(MATERIAL_BEDROCK);
  });

  it("returns solid at surface and air above surface", () => {
    resetConfig();
    updateConfig({ terrain: { bedrockY: -50 } });
    const seed = getSeed(1);
    const world = new WorldModel({ seed });
    const surfaceY = getSurfaceHeight(0, 0, seed);
    expect(world.baseMaterialAt(0, surfaceY, 0)).toBe(MATERIAL_SOLID);
    expect(world.baseMaterialAt(0, surfaceY + 1, 0)).toBe(MATERIAL_AIR);
  });

  it("allows mining a frontier voxel on the surface", () => {
    resetConfig();
    updateConfig({ terrain: { bedrockY: -50 } });
    const seed = getSeed(1);
    const world = new WorldModel({ seed });
    const cfg = getConfig();
    world.initializeFrontierFromSurface(cfg.terrain.worldRadius);
    const surfaceY = getSurfaceHeight(2, 2, seed);
    const edit = world.mineVoxel(2, surfaceY, 2);
    expect(edit).not.toBeNull();
    expect(edit?.edit.mat).toBe(MATERIAL_AIR);
    expect(world.materialAt(2, surfaceY, 2)).toBe(MATERIAL_AIR);
  });

  it("rejects mining a non-frontier interior voxel", () => {
    resetConfig();
    updateConfig({ terrain: { bedrockY: -50 } });
    const seed = getSeed(1);
    const world = new WorldModel({ seed });
    const surfaceY = getSurfaceHeight(3, 3, seed);
    const interiorY = surfaceY - 2;
    const edit = world.mineVoxel(3, interiorY, 3);
    expect(edit).toBeNull();
  });
});
