import { describe, expect,it } from "vitest";

import { getVoxelColor, getVoxelValue } from "../src/utils";

describe("voxel utils", () => {
  it("getVoxelValue boundaries", () => {
    expect(getVoxelValue(0)).toBe(1); // water/sand
    expect(getVoxelValue(1)).toBe(2); // grass
    expect(getVoxelValue(5)).toBe(5); // forest
    expect(getVoxelValue(8)).toBe(15); // rock/ore
    expect(getVoxelValue(12)).toBe(50); // snow
  });

  it("getVoxelColor boundaries", () => {
    expect(getVoxelColor(-2).getHexString()).toBe("1a4d8c"); // Deep Water
    expect(getVoxelColor(0).getHexString()).toBe("2d73bf"); // Water
    expect(getVoxelColor(1).getHexString()).toBe("e3dba3"); // Sand
    expect(getVoxelColor(3).getHexString()).toBe("59a848"); // Grass
    expect(getVoxelColor(6).getHexString()).toBe("3b7032"); // Dark Grass/Forest
    expect(getVoxelColor(9).getHexString()).toBe("6e6e6e"); // Rock
    expect(getVoxelColor(11).getHexString()).toBe("ffffff"); // Snow
  });
});
