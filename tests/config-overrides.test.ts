import { beforeEach,describe, expect, it } from "vitest";

import { getConfig, resetConfig,updateConfig } from "../src/config/index";
import { computeVoxel, getSeed } from "../src/sim/terrain";
import { noise2D } from "../src/utils";

beforeEach(() => {
  resetConfig();
});

describe("config overrides (TDD)", () => {
  it("updateConfig should override defaults", () => {
    updateConfig({ terrain: { baseSeed: 999 } });
    expect(getConfig().terrain.baseSeed).toBe(999);
  });

  it("computeVoxel should respect terrain config overrides for bias/scale", () => {
    const x = 2;
    const z = 3;

    updateConfig({ terrain: { surfaceBias: 0.25, quantizeScale: 2 } });

    const seed = getSeed(1);
    const raw = noise2D(x, z, seed);
    const expectedY = Math.floor((raw + 0.25) * 2);

    const v = computeVoxel(x, z);
    expect(v.y).toBe(expectedY);
  });
});
