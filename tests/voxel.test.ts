import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config/index";
import { TERRAIN_COLORS } from "../src/sim/terrain-constants";
import { getVoxelColor, getVoxelValueFromHeight as getVoxelValue } from "../src/sim/terrain-core";

describe("voxel utils", () => {
  it("getVoxelValue boundaries (relative to waterLevel)", () => {
    const water = getConfig().terrain.waterLevel;
    expect(getVoxelValue(water)).toBe(1); // water
    expect(getVoxelValue(water + 1)).toBe(2); // near water
    expect(getVoxelValue(water + 4)).toBe(5); // shallow land
    expect(getVoxelValue(water + 7)).toBe(15); // rock/ore band
    expect(getVoxelValue(water + 10)).toBe(50); // high land/snow
  });

  it("getVoxelColor boundaries (relative to waterLevel via config)", () => {
    const water = getConfig().terrain.waterLevel;
    expect(getVoxelColor(water - 3)).toBe(TERRAIN_COLORS.DEEP_WATER); // Deep Water
    expect(getVoxelColor(water)).toBe(TERRAIN_COLORS.WATER); // Water
    expect(getVoxelColor(water + 2)).toBe(TERRAIN_COLORS.SAND); // Sand
    expect(getVoxelColor(water + 5)).toBe(TERRAIN_COLORS.GRASS); // Grass
    expect(getVoxelColor(water + 11)).toBe(TERRAIN_COLORS.DARK_GRASS); // Dark Grass/Forest
    expect(getVoxelColor(water + 19)).toBe(TERRAIN_COLORS.ROCK); // Rock
    expect(getVoxelColor(water + 21)).toBe(TERRAIN_COLORS.SNOW); // Snow
  });
});
