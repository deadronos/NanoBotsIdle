import { describe, expect, test } from "vitest";

import { generateRadialOffsets } from "../src/utils/chunkPriority";

describe("generateRadialOffsets", () => {
  test("center first and non-decreasing distances (3D)", () => {
    const offsets = generateRadialOffsets(2, 3);
    expect(offsets.length).toBeGreaterThan(0);

    // center should be first
    expect(offsets[0]).toEqual({ dx: 0, dy: 0, dz: 0 });

    // distances should be non-decreasing
    const distances = offsets.map((o) => o.dx * o.dx + o.dy * o.dy + o.dz * o.dz);
    for (let i = 0; i < distances.length - 1; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
    }
  });

  test("2D mode sets dy to 0 and orders by horizontal distance", () => {
    const offsets = generateRadialOffsets(2, 2);
    expect(offsets[0]).toEqual({ dx: 0, dy: 0, dz: 0 });
    for (const o of offsets) {
      expect(o.dy).toBe(0);
    }
    const distances = offsets.map((o) => o.dx * o.dx + o.dz * o.dz);
    for (let i = 0; i < distances.length - 1; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
    }
  });
});
