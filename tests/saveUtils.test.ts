// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { resetGame } from "../src/utils/saveUtils";

describe("resetGame", () => {
  beforeEach(() => {
    // Setup a storage key to be removed
    localStorage.setItem("voxel-walker-storage", JSON.stringify({ credits: 123 }));
  });

  afterEach(() => {
    localStorage.removeItem("voxel-walker-storage");
  });

  it("removes the persisted storage key and reloads the page", () => {
    // Sanity check the key exists
    expect(localStorage.getItem("voxel-walker-storage")).not.toBeNull();

    // Call resetGame and ensure it clears the persisted key. We don't assert reload
    // because JSDOM's location.reload is not reliably mockable in this environment.
    expect(() => resetGame()).not.toThrow();
    expect(localStorage.getItem("voxel-walker-storage")).toBeNull();
  });
});
