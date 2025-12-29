import { describe, expect,it } from "vitest";

import { defaultRenderConfig } from "../src/config/render";

describe("render config defaults (TDD)", () => {
  it("should expose sky and clouds defaults", () => {
    expect(defaultRenderConfig.sky.distance).toBe(450000);
    expect(defaultRenderConfig.sky.azimuth).toBeCloseTo(0.25, 5);
    expect(defaultRenderConfig.clouds.rotationSpeed).toBeCloseTo(0.01, 5);
    expect(defaultRenderConfig.ambientLightIntensity).toBeCloseTo(0.4, 5);
  });
});
