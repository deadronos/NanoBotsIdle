import { afterEach, describe, expect, it, vi } from "vitest";

import { pickTargetKey } from "../src/engine/targeting";

describe("pickTargetKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when world is missing or frontier empty", () => {
    const reserved = new Set<number>();
    const mined = new Set<number>();

    expect(
      pickTargetKey({
        world: null,
        frontierKeys: [1],
        minedKeys: mined,
        reservedKeys: reserved,
        waterLevel: 0,
        maxAttempts: 10,
      }),
    ).toBeNull();

    expect(
      pickTargetKey({
        world: { coordsFromKey: () => ({ x: 0, y: 0, z: 0 }) } as never,
      frontierKeys: [],
        minedKeys: mined,
        reservedKeys: reserved,
        waterLevel: 0,
        maxAttempts: 10,
      }),
    ).toBeNull();
  });

  it("skips keys below waterline and does not reserve them", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reserved = new Set<number>();
    const mined = new Set<number>();
    const world = {
      coordsFromKey: (_key: number) => ({ x: 0, y: -1, z: 0 }),
    } as never;

    const key = pickTargetKey({
      world,
      frontierKeys: [1],
      minedKeys: mined,
      reservedKeys: reserved,
      waterLevel: 0,
      maxAttempts: 3,
    });

    expect(key).toBeNull();
    expect(reserved.size).toBe(0);
  });

  it("reserves and returns a valid key at/above waterline", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reserved = new Set<number>();
    const mined = new Set<number>();
    const world = {
      coordsFromKey: (key: number) => ({ x: 0, y: key === 1 ? 0 : 10, z: 0 }),
    } as never;

    const key = pickTargetKey({
      world,
      frontierKeys: [1],
      minedKeys: mined,
      reservedKeys: reserved,
      waterLevel: 0.2, // floored to 0
      maxAttempts: 10,
    });

    expect(key).toBe(1);
    expect(reserved.has(1)).toBe(true);
  });

  it("skips mined/reserved keys and may return null after maxAttempts", () => {
    const randomSpy = vi.spyOn(Math, "random");
    // Always pick index 0
    randomSpy.mockReturnValue(0);

    const reserved = new Set<number>([1]);
    const mined = new Set<number>([2]);
    const world = {
      coordsFromKey: (_key: number) => ({ x: 0, y: 10, z: 0 }),
    } as never;

    const key = pickTargetKey({
      world,
      frontierKeys: [1, 2],
      minedKeys: mined,
      reservedKeys: reserved,
      waterLevel: 0,
      maxAttempts: 2,
    });

    expect(key).toBeNull();
    expect(reserved.has(1)).toBe(true);
    expect(reserved.has(2)).toBe(false);
  });
});
