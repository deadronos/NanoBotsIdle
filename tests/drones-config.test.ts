import { describe, expect, it } from "vitest";

import dronesConfig, { getDroneMoveSpeed, getMineDuration } from "../src/config/drones";
import { getConfig } from "../src/config/index";

describe("drones config & helpers (TDD)", () => {
  it("should export sensible defaults", () => {
    expect(dronesConfig.baseMoveSpeed).toBe(5);
    expect(dronesConfig.moveSpeedPerLevel).toBe(2);
    expect(dronesConfig.baseMineDuration).toBe(2.0);
    expect(dronesConfig.minMineDuration).toBe(0.2);
    expect(dronesConfig.particle.maxParticles).toBe(400);
  });

  it("should compute move speed and mine duration using helpers", () => {
    const cfg = getConfig();
    expect(getDroneMoveSpeed(0, cfg)).toBe(5);
    expect(getDroneMoveSpeed(1, cfg)).toBe(7);
    expect(getMineDuration(0, cfg)).toBe(2.0);
    expect(getMineDuration(5, cfg)).toBeGreaterThanOrEqual(0.2);
  });
});
