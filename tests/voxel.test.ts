import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config/index";
import { getVoxelColor, getVoxelValue } from "../src/utils";

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
    expect(getVoxelColor(water - 3)).toBe(0x1a4d8c); // Deep Water
    expect(getVoxelColor(water)).toBe(0x2d73bf); // Water
    expect(getVoxelColor(water + 2)).toBe(0xe3dba3); // Sand
    expect(getVoxelColor(water + 5)).toBe(0x59a848); // Grass
    expect(getVoxelColor(water + 11)).toBe(0x3b7032); // Dark Grass/Forest
    expect(getVoxelColor(water + 19)).toBe(0x6e6e6e); // Rock
    expect(getVoxelColor(water + 21)).toBe(0xffffff); // Snow
  });
});
