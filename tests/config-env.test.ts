import { describe, it, expect } from "vitest";

import { parseEnvToConfig } from "../src/config/env";

describe("env parsing to config (TDD)", () => {
  it("should parse VITE_TERRAIN_BASE_SEED and VITE_PLAYER_PLAYERHEIGHT into partial config with typed values", () => {
    const env = {
      VITE_TERRAIN_BASE_SEED: "555",
      VITE_TERRAIN_SURFACE_BIAS: "0.75",
      VITE_PLAYER_PLAYER_HEIGHT: "2.1",
    } as Record<string, string>;

    const partial = parseEnvToConfig(env);

    expect(partial.terrain?.baseSeed).toBe(555);
    expect(partial.terrain?.surfaceBias).toBeCloseTo(0.75, 5);
    expect(partial.player?.playerHeight).toBeCloseTo(2.1, 5);
  });
});
