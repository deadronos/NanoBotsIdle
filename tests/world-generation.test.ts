import { describe, expect,it } from "vitest";

import { WORLD_RADIUS } from "../src/constants";
import { computeVoxel,generateInstances } from "../src/sim/terrain";

describe("world generation (TDD)", () => {
  it("generateInstances should produce expected number of instances and match computeVoxel for samples", () => {
    const seed = 222;
    const instances = generateInstances(seed, WORLD_RADIUS);
    const expectedCount = (2 * WORLD_RADIUS + 1) * (2 * WORLD_RADIUS + 1);
    expect(instances.length).toBe(expectedCount);

    const sample = instances.find((v) => v.x === 0 && v.z === 0);
    expect(sample).toBeDefined();
    expect(sample!.y).toBe(computeVoxel(0, 0, seed).y);
    expect(sample!.value).toBe(computeVoxel(0, 0, seed).value);
  });
});
