import { describe, expect, it } from "vitest";

import { createLodThresholds, selectLodLevel } from "../src/render/lodUtils";

describe("LOD selection", () => {
  it("uses squared thresholds to downgrade or hide far chunks", () => {
    const thresholds = createLodThresholds(16, {
      lowDistanceMultiplier: 4,
      hideDistanceMultiplier: 6,
    });

    expect(selectLodLevel((16 * 3) ** 2, thresholds)).toBe("high");
    expect(selectLodLevel((16 * 5) ** 2, thresholds)).toBe("low");
    expect(selectLodLevel((16 * 7) ** 2, thresholds)).toBe("hidden");
  });
});
