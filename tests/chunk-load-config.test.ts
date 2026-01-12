import { describe, expect, it } from "vitest";

import { normalizeChunkLoadConfig } from "../src/components/world/chunkLoadConfig";

describe("chunk load config", () => {
  it("keeps benchmark overrides while clamping invalid values", () => {
    const config = normalizeChunkLoadConfig({
      initialRadius: 0,
      initialDims: 2,
      activeRadius: 6,
      activeDims: 3,
    });

    expect(config.initialRadius).toBe(1);
    expect(config.activeRadius).toBe(6);
    expect(config.initialDims).toBe(2);
    expect(config.activeDims).toBe(3);
  });
});
