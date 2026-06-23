import { describe, expect, it } from "vitest";

import type { PersistableGameFields, PersistableUi } from "../src/utils/simFramePersist";
import { buildPersistedPatch, outpostsUnchanged } from "../src/utils/simFramePersist";

const baseUi: PersistableUi = {
  credits: 0,
  prestigeLevel: 1,
  droneCount: 3,
  haulerCount: 0,
  miningSpeedLevel: 1,
  moveSpeedLevel: 1,
  laserPowerLevel: 1,
  minedBlocks: 0,
  totalBlocks: 0,
};

const basePrev: PersistableGameFields = {
  ...baseUi,
  outposts: [],
};

describe("outpostsUnchanged", () => {
  it("returns true for the same reference", () => {
    const list = [{ id: "a", x: 0, y: 0, z: 0, level: 1 }];
    expect(outpostsUnchanged(list, list)).toBe(true);
  });

  it("returns true for structurally-equal arrays of the same length", () => {
    const a = [{ id: "a", x: 1, y: 2, z: 3, level: 1 }];
    const b = [{ id: "a", x: 1, y: 2, z: 3, level: 1 }];
    expect(outpostsUnchanged(a, b)).toBe(true);
  });

  it("returns false when lengths differ", () => {
    const a = [{ id: "a", x: 0, y: 0, z: 0, level: 1 }];
    const b: typeof a = [];
    expect(outpostsUnchanged(a, b)).toBe(false);
  });

  it("returns false when an item's coordinates differ", () => {
    const a = [{ id: "a", x: 0, y: 0, z: 0, level: 1 }];
    const b = [{ id: "a", x: 1, y: 0, z: 0, level: 1 }];
    expect(outpostsUnchanged(a, b)).toBe(false);
  });

  it("returns false when an item's id differs", () => {
    const a = [{ id: "a", x: 0, y: 0, z: 0, level: 1 }];
    const b = [{ id: "b", x: 0, y: 0, z: 0, level: 1 }];
    expect(outpostsUnchanged(a, b)).toBe(false);
  });
});

describe("buildPersistedPatch", () => {
  it("returns an empty patch when nothing has changed", () => {
    const patch = buildPersistedPatch(basePrev, baseUi, []);
    expect(patch).toEqual({});
  });

  it("includes only the changed scalar fields", () => {
    const next: PersistableUi = {
      ...baseUi,
      credits: 50,
      droneCount: 4,
      miningSpeedLevel: 2,
    };
    const patch = buildPersistedPatch(basePrev, next, []);
    expect(patch).toEqual({
      credits: 50,
      droneCount: 4,
      miningSpeedLevel: 2,
    });
  });

  it("emits a fresh outposts array when contents differ", () => {
    const outposts = [{ id: "x", x: 1, y: 2, z: 3, level: 1 }];
    const patch = buildPersistedPatch(basePrev, baseUi, outposts);
    expect(patch.outposts).toBe(outposts);
  });

  it("does not emit outposts when structurally equal", () => {
    const outposts = [{ id: "x", x: 1, y: 2, z: 3, level: 1 }];
    const prev: PersistableGameFields = { ...basePrev, outposts };
    const nextOutposts = [{ id: "x", x: 1, y: 2, z: 3, level: 1 }];
    const patch = buildPersistedPatch(prev, baseUi, nextOutposts);
    expect(patch.outposts).toBeUndefined();
  });

  it("captures prestigeLevel changes without touching other fields", () => {
    const next: PersistableUi = { ...baseUi, prestigeLevel: 2 };
    const patch = buildPersistedPatch(basePrev, next, []);
    expect(patch).toEqual({ prestigeLevel: 2 });
  });

  it("captures all upgrade-level changes when several move at once", () => {
    const next: PersistableUi = {
      ...baseUi,
      miningSpeedLevel: 2,
      moveSpeedLevel: 3,
      laserPowerLevel: 2,
    };
    const patch = buildPersistedPatch(basePrev, next, []);
    expect(patch).toEqual({
      miningSpeedLevel: 2,
      moveSpeedLevel: 3,
      laserPowerLevel: 2,
    });
  });
});