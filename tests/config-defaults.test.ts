import { describe, it, expect } from "vitest";

import { getConfig } from "../src/config/index";

describe("config defaults (TDD)", () => {
  it("should expose terrain and player defaults", () => {
    const cfg = getConfig();
    expect(cfg.terrain.baseSeed).toBe(123);
    expect(cfg.terrain.surfaceBias).toBe(0.6);
    expect(cfg.terrain.quantizeScale).toBe(4);
    expect(cfg.player.playerHeight).toBe(1.8);
  });
});
