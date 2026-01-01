import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config/index";
import { getGroundHeightWithEdits } from "../src/sim/collision";
import { getPlayerGroundHeight } from "../src/sim/player";

describe("player physics helper (TDD)", () => {
  it("getPlayerGroundHeight should equal groundHeight + player offsets", () => {
    const x = 3;
    const z = -2;
    const prestige = 1;
    const cfg = getConfig();

    const expected = getGroundHeightWithEdits(x, z, prestige) + 1.0 + cfg.player.playerHeight;
    expect(getPlayerGroundHeight(x, z, prestige)).toBe(expected);
  });
});
