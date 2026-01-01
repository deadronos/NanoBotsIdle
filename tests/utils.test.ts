import { describe, expect, it, vi } from "vitest";

import { getSmoothHeight } from "../src/sim/terrain";
import type * as TerrainCore from "../src/sim/terrain-core";
import { getVoxelColor, getVoxelType, noise2D } from "../src/sim/terrain-core";
import { random } from "../src/utils";

const { noise2DMock } = vi.hoisted(() => {
  return { noise2DMock: vi.fn<(x: number, z: number) => number>() };
});

vi.mock("../src/sim/terrain-core", async (importOriginal) => {
  const actual = await importOriginal<typeof TerrainCore>();
  return {
    ...actual,
    getVoxelValueFromHeight: (y: number, waterLevel = -12) => y - waterLevel,
    noise2D: (x: number, z: number) => noise2DMock(x, z),
  };
});

describe("src/utils.ts", () => {
  it("random is deterministic and in [0,1)", () => {
    const a = random(123);
    const b = random(123);
    const c = random(124);

    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(a).toBeCloseTo(b);
    expect(a).not.toBeCloseTo(c);
  });

  it("getVoxelColor maps height bands relative to water level", () => {
    const wl = -12;
    expect(getVoxelColor(wl - 100, wl)).toBe(0x1a4d8c); // deep water
    expect(getVoxelColor(wl - 2, wl)).toBe(0x2d73bf); // boundary: not deep water anymore
    expect(getVoxelColor(wl, wl)).toBe(0x2d73bf); // water
    expect(getVoxelColor(wl + 1, wl)).toBe(0xe3dba3); // sand
    expect(getVoxelColor(wl + 3, wl)).toBe(0x59a848); // grass
    expect(getVoxelColor(wl + 10, wl)).toBe(0x3b7032); // dark grass
    expect(getVoxelColor(wl + 19, wl)).toBe(0x6e6e6e); // rock
    expect(getVoxelColor(wl + 100, wl)).toBe(0xffffff); // snow
  });

  it("getVoxelType treats waterLevel as inclusive", () => {
    expect(getVoxelType(-12, -12)).toBe("water");
    expect(getVoxelType(-11, -12)).toBe("solid");
  });


  it("getSmoothHeight is continuous (no quantization)", () => {
    noise2DMock.mockReturnValue(0.25);
    expect(getSmoothHeight(10, 20)).toBeCloseTo(0.5);
  });

  it("re-exports terrain-core noise2D", () => {
    noise2DMock.mockReturnValue(0.123);
    expect(noise2D(1, 2)).toBeCloseTo(0.123);
  });
});
