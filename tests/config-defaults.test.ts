import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config/index";

describe("config defaults (TDD)", () => {
  it("should expose terrain and player defaults", () => {
    const cfg = getConfig();
    expect(cfg.terrain.baseSeed).toBe(123);
    expect(cfg.terrain.surfaceBias).toBe(2.0);
    expect(cfg.terrain.quantizeScale).toBe(3);
    expect(cfg.terrain.noiseType).toBe("open-simplex");
    expect(cfg.player.playerHeight).toBe(1.8);
  });
});
