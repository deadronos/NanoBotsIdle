import { describe, expect, it } from "vitest";

import { defaultRenderConfig, type VoxelRenderMode } from "../src/config/render";

describe("render config defaults (TDD)", () => {
  it("should expose daylight and voxel defaults", () => {
    expect(defaultRenderConfig.sky.distance).toBe(450000);
    expect(defaultRenderConfig.sky.sunPosition).toEqual(defaultRenderConfig.sun.position);
    expect(defaultRenderConfig.ambientLightIntensity).toBeCloseTo(0.65, 5);
    expect(defaultRenderConfig.voxels.mode).toBe("meshed");
    expect(defaultRenderConfig.voxels.debugCompare.enabled).toBe(false);
    expect(defaultRenderConfig.voxels.biomeOverlay.enabled).toBe(false);
  });

  it("should allow meshed voxel mode (type-level)", () => {
    const mode: VoxelRenderMode = "meshed";
    expect(mode).toBe("meshed");
  });
});
