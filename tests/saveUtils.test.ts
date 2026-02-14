// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as simBridge from "../src/simBridge/simBridge";
import * as logger from "../src/utils/logger";
import { resetGame } from "../src/utils/saveUtils";

const ensureMockStorage = () => {
  if (
    typeof globalThis.localStorage !== "undefined" &&
    typeof globalThis.localStorage.setItem === "function" &&
    typeof globalThis.localStorage.getItem === "function" &&
    typeof globalThis.localStorage.removeItem === "function"
  ) {
    return;
  }

  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (map.has(k) ? (map.get(k) ?? null) : null),
      setItem: (k: string, v: string) => {
        map.set(String(k), String(v));
      },
      removeItem: (k: string) => {
        map.delete(String(k));
      },
      clear: () => {
        map.clear();
      },
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      get length() {
        return map.size;
      },
    } as Storage,
  });
};

describe("resetGame", () => {
  beforeEach(() => {
    ensureMockStorage();
    // Setup a storage key to be removed
    localStorage.setItem("voxel-walker-storage", JSON.stringify({ credits: 123 }));
  });

  afterEach(() => {
    localStorage.removeItem("voxel-walker-storage");
  });

  it("removes the persisted storage key and reloads the page", () => {
    // Sanity check the key exists
    expect(localStorage.getItem("voxel-walker-storage")).not.toBeNull();

    // Spy on simBridge stop to ensure we attempt to pause simulation before reset
    const stopSpy = vi.spyOn(simBridge.getSimBridge(), "stop");

    // Call resetGame and ensure it clears the persisted key. We don't assert reload
    // because JSDOM's location.reload is not reliably mockable in this environment.
    expect(() => resetGame()).not.toThrow();
    expect(localStorage.getItem("voxel-walker-storage")).toBeNull();
    expect(stopSpy).toHaveBeenCalled();
    stopSpy.mockRestore();
  });

  it("best-effort: warns if sim bridge stop fails", () => {
    const warnSpy = vi.spyOn(logger, "warn");
    const bridgeSpy = vi.spyOn(simBridge, "getSimBridge").mockImplementation(() => {
      throw new Error("bridge missing");
    });

    expect(() => resetGame()).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    bridgeSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
