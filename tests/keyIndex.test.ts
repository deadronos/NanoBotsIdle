import { describe, expect, it } from "vitest";

import {
  addKey,
  createKeyIndex,
  removeKey,
  resetKeyIndex,
} from "../src/engine/keyIndex";

describe("keyIndex", () => {
  it("creates an empty index", () => {
    const idx = createKeyIndex();
    expect(idx.keys).toEqual([]);
    expect(idx.index.size).toBe(0);
  });

  it("reset populates keys and map", () => {
    const idx = createKeyIndex();
    resetKeyIndex(idx, ["a", "b"]);
    expect(idx.keys).toEqual(["a", "b"]);
    expect(idx.index.get("a")).toBe(0);
    expect(idx.index.get("b")).toBe(1);
  });

  it("addKey ignores duplicates", () => {
    const idx = createKeyIndex();
    addKey(idx, "a");
    addKey(idx, "a");
    expect(idx.keys).toEqual(["a"]);
    expect(idx.index.get("a")).toBe(0);
  });

  it("removeKey uses swap-with-last and keeps index consistent", () => {
    const idx = createKeyIndex();
    resetKeyIndex(idx, ["a", "b", "c"]);

    removeKey(idx, "b");

    expect(idx.keys).toHaveLength(2);
    // "c" should be swapped into the removed slot
    expect(idx.keys[1]).toBe("c");
    expect(idx.index.has("b")).toBe(false);
    expect(idx.index.get("c")).toBe(1);
  });

  it("removeKey is a no-op if key missing", () => {
    const idx = createKeyIndex();
    resetKeyIndex(idx, ["a"]);
    removeKey(idx, "missing");
    expect(idx.keys).toEqual(["a"]);
    expect(idx.index.get("a")).toBe(0);
  });
});

