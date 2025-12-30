import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config/index";
import { getVoxelColor, getVoxelValue } from "../src/utils";

describe("voxel utils", () => {
  it("getVoxelValue boundaries (relative to waterLevel -20)", () => {
    expect(getVoxelValue(-20)).toBe(1); // water
    expect(getVoxelValue(-19)).toBe(2); // near water
    expect(getVoxelValue(-16)).toBe(5); // shallow land
    expect(getVoxelValue(-13)).toBe(15); // rock/ore band
    expect(getVoxelValue(-10)).toBe(50); // high land/snow
  });

  it("getVoxelColor boundaries (relative to waterLevel via config)", () => {
    const water = getConfig().terrain.waterLevel;
    expect(getVoxelColor(water - 3).getHexString()).toBe("1a4d8c"); // Deep Water
    expect(getVoxelColor(water).getHexString()).toBe("2d73bf"); // Water
    expect(getVoxelColor(water + 2).getHexString()).toBe("e3dba3"); // Sand
    expect(getVoxelColor(water + 5).getHexString()).toBe("59a848"); // Grass
    expect(getVoxelColor(water + 11).getHexString()).toBe("3b7032"); // Dark Grass/Forest
    expect(getVoxelColor(water + 19).getHexString()).toBe("6e6e6e"); // Rock
    expect(getVoxelColor(water + 21).getHexString()).toBe("ffffff"); // Snow
  });
});
