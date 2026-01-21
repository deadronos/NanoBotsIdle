import { describe, expect, test } from "vitest";

import { type Moveable, moveTowards } from "../src/engine/movement";

describe("moveTowards", () => {
  test("returns 0 distance and does not move when already at target", () => {
    const entity: Moveable = { x: 10, y: 20, z: 30 };
    const dist = moveTowards(entity, 10, 20, 30, 5, 1);

    expect(dist).toBe(0);
    expect(entity.x).toBe(10);
    expect(entity.y).toBe(20);
    expect(entity.z).toBe(30);
  });

  test("moves partway when distance > speed * dt", () => {
    // Start at 0,0,0, target 10,0,0. Speed 2, dt 1. Should move 2 units.
    const entity: Moveable = { x: 0, y: 0, z: 0 };
    const dist = moveTowards(entity, 10, 0, 0, 2, 1);

    expect(dist).toBe(10);
    expect(entity.x).toBe(2);
    expect(entity.y).toBe(0);
    expect(entity.z).toBe(0);
  });

  test("clamps to target when distance < speed * dt", () => {
    // Start at 0,0,0, target 1,0,0. Speed 2, dt 1. Should move 1 unit to target.
    const entity: Moveable = { x: 0, y: 0, z: 0 };
    const dist = moveTowards(entity, 1, 0, 0, 2, 1);

    expect(dist).toBe(1);
    expect(entity.x).toBe(1);
    expect(entity.y).toBe(0);
    expect(entity.z).toBe(0);
  });

  test("moves correctly in 3D space", () => {
    // Start 0,0,0. Target 3,4,0 (hypot 5). Speed 10, dt 0.5 (move 5 units).
    // Should reach target.
    const entity: Moveable = { x: 0, y: 0, z: 0 };
    const dist = moveTowards(entity, 3, 4, 0, 10, 0.5);

    expect(dist).toBe(5);
    expect(entity.x).toBe(3);
    expect(entity.y).toBe(4);
    expect(entity.z).toBe(0);
  });

  test("moves correctly in 3D space partial", () => {
    // Start 0,0,0. Target 3,4,0 (hypot 5). Speed 2.5, dt 1 (move 2.5 units, which is half way).
    const entity: Moveable = { x: 0, y: 0, z: 0 };
    const dist = moveTowards(entity, 3, 4, 0, 2.5, 1);

    expect(dist).toBe(5);
    expect(entity.x).toBeCloseTo(1.5);
    expect(entity.y).toBeCloseTo(2);
    expect(entity.z).toBe(0);
  });
});
