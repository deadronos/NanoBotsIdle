import { describe, expect,it } from "vitest";

import { PLAYER_HEIGHT } from "../src/constants";
import { getPlayerGroundHeight } from "../src/sim/player";
import { getSeed,getSurfaceHeight } from "../src/sim/terrain";

describe("player physics helper (TDD)", () => {
  it("getPlayerGroundHeight should equal surfaceHeight + player offsets", () => {
    const x = 3;
    const z = -2;
    const prestige = 1;
    const seed = getSeed(prestige);

    const expected = getSurfaceHeight(x, z, seed) + 0.5 + PLAYER_HEIGHT;
    expect(getPlayerGroundHeight(x, z, prestige)).toBe(expected);
  });
});
