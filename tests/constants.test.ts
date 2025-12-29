import { describe, expect,it } from "vitest";

// This test models the expected constants API before implementation (TDD failing test)
import * as C from "../src/constants";

describe("constants (TDD)", () => {
  it("should expose expected numeric constants", () => {
    expect(C.WATER_LEVEL).toBe(0.2);
    expect(C.BASE_SEED).toBe(123);
    expect(C.PRESTIGE_SEED_DELTA).toBe(99);
    expect(C.WORLD_RADIUS).toBe(30);
    expect(C.PLAYER_HEIGHT).toBe(1.8);
    expect(C.WALKING_SPEED).toBe(5);
    expect(C.RUNNING_SPEED).toBe(8);
    expect(C.JUMP_FORCE).toBe(8);
    expect(C.GRAVITY).toBe(20);
  });
});
