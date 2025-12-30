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

  it("emits bounded frontier deltas (edit affects <= 7 voxels)", () => {
    resetConfig();
    updateConfig({ terrain: { bedrockY: -50 } });
    const seed = getSeed(1);
    const world = new WorldModel({ seed });
    const cfg = getConfig();
    world.initializeFrontierFromSurface(cfg.terrain.worldRadius);

    const x = 2;
    const z = 2;
    const y = getSurfaceHeight(x, z, seed);
    const result = world.mineVoxel(x, y, z);

    expect(result).not.toBeNull();
    expect(result?.frontierAdded.length).toBeLessThanOrEqual(7);
    expect(result?.frontierRemoved.length).toBeLessThanOrEqual(7);
  });

  it("removes the mined voxel from the frontier", () => {
    resetConfig();
    updateConfig({ terrain: { bedrockY: -50 } });
    const seed = getSeed(1);
    const world = new WorldModel({ seed });
    const cfg = getConfig();
    world.initializeFrontierFromSurface(cfg.terrain.worldRadius);

    const x = 2;
    const z = 2;
    const y = getSurfaceHeight(x, z, seed);
    const result = world.mineVoxel(x, y, z);

    expect(result).not.toBeNull();
    expect(result?.frontierRemoved).toContainEqual({ x, y, z });
  });
});
