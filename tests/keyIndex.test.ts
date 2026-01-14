import { describe, expect, it } from "vitest";

import { addKey, createKeyIndex, removeKey, resetKeyIndex } from "../src/engine/keyIndex";

describe("keyIndex", () => {
  it("creates an empty index", () => {
    const idx = createKeyIndex<number>();
    expect(idx.keys).toEqual([]);
    expect(idx.index.size).toBe(0);
  });

  it("reset populates keys and map", () => {
    const idx = createKeyIndex<number>();
    resetKeyIndex(idx, [1, 2]);
    expect(idx.keys).toEqual([1, 2]);
    expect(idx.index.get(1)).toBe(0);
    expect(idx.index.get(2)).toBe(1);
  });

  it("addKey ignores duplicates", () => {
    const idx = createKeyIndex<number>();
    addKey(idx, 1);
    addKey(idx, 1);
    expect(idx.keys).toEqual([1]);
    expect(idx.index.get(1)).toBe(0);
  });

  it("removeKey uses swap-with-last and keeps index consistent", () => {
    const idx = createKeyIndex<number>();
    resetKeyIndex(idx, [1, 2, 3]);

    removeKey(idx, 2);

    expect(idx.keys).toHaveLength(2);
    // "c" should be swapped into the removed slot
    expect(idx.keys[1]).toBe(3);
    expect(idx.index.has(2)).toBe(false);
    expect(idx.index.get(3)).toBe(1);
  });

  it("removeKey is a no-op if key missing", () => {
    const idx = createKeyIndex();
    resetKeyIndex(idx, [1]);
    removeKey(idx, 2);
    expect(idx.keys).toEqual([1]);
    expect(idx.index.get(1)).toBe(0);
  });
});
