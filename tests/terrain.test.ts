import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config/index";
import * as C from "../src/constants";
// TDD: expect terrain module to implement specific, deterministic behavior
import * as T from "../src/sim/terrain";
import { getVoxelValue, noise2D } from "../src/utils";

describe("terrain module (TDD)", () => {
  it("should export getSeed and computeVoxel functions", () => {
    expect(typeof T.getSeed).toBe("function");
    expect(typeof T.computeVoxel).toBe("function");
    expect(typeof T.getSurfaceHeight).toBe("function");
    expect(typeof T.getSmoothHeight).toBe("function");
  });

  it("getSeed should return BASE_SEED + PRESTIGE_SEED_DELTA * prestigeLevel", () => {
    const seed = T.getSeed(1);
    expect(seed).toBe(C.BASE_SEED + C.PRESTIGE_SEED_DELTA * 1);
  });

  it("computeVoxel y should match surfaceBias/quantizeScale formula and value should match getVoxelValue", () => {
    const x = 2;
    const z = 3;
    const seed = T.getSeed(1);
    const v = T.computeVoxel(x, z, seed);

    const raw = noise2D(x, z, seed);
    const cfg = getConfig();
    const expectedY = Math.floor((raw + cfg.terrain.surfaceBias) * cfg.terrain.quantizeScale);

    expect(v.y).toBe(expectedY);
    expect(v.value).toBe(getVoxelValue(v.y));
  });

  it("getSurfaceHeight should equal computeVoxel(...).y", () => {
    const x = -4;
    const z = 5;
    const seed = T.getSeed(2);
    expect(T.getSurfaceHeight(x, z, seed)).toBe(T.computeVoxel(x, z, seed).y);
  });
});
