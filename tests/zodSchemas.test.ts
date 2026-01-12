import { describe, expect, it } from "vitest";

import { FromWorkerSchema, ToWorkerSchema } from "../src/shared/schemas";

describe("Zod Bridge Schemas", () => {
  it("validates correct INIT message", () => {
    const msg = {
      t: "INIT",
      seed: 12345,
      saveState: {
        credits: 100,
        prestigeLevel: 1,
        droneCount: 5,
        haulerCount: 2,
        miningSpeedLevel: 1,
        moveSpeedLevel: 1,
        laserPowerLevel: 1,
        minedBlocks: 0,
        totalBlocks: 0,
        upgrades: { speed: 1 },
        outposts: [],
      },
    };
    const result = ToWorkerSchema.safeParse(msg);
    expect(result.success).toBe(true);
  });

  it("validates correct STEP message", () => {
    const msg = {
      t: "STEP",
      frameId: 100,
      nowMs: 2000,
      budgetMs: 8,
      maxSubsteps: 4,
      cmds: [],
    };
    const result = ToWorkerSchema.safeParse(msg);
    expect(result.success).toBe(true);
  });

  it("rejects invalid STEP message (missing field)", () => {
    const msg = {
      t: "STEP",
      frameId: 100,
      // nowMs missing
      budgetMs: 8,
      maxSubsteps: 4,
      cmds: [],
    };
    const result = ToWorkerSchema.safeParse(msg);
    expect(result.success).toBe(false);
  });

  it("validates correct FRAME message", () => {
    const msg = {
      t: "FRAME",
      frameId: 100,
      delta: {
        tick: 100,
        entities: new Float32Array([1, 2, 3]),
      },
      ui: {
        credits: 100,
        prestigeLevel: 1,
        droneCount: 5,
        haulerCount: 2,
        diverCount: 0,
        miningSpeedLevel: 1,
        moveSpeedLevel: 1,
        laserPowerLevel: 1,
        minedBlocks: 0,
        totalBlocks: 0,
        upgrades: {},
        outposts: [],
      },
    };
    const result = FromWorkerSchema.safeParse(msg);
    expect(result.success).toBe(true);
  });

  it("validates correct ERROR message", () => {
    const msg = {
      t: "ERROR",
      message: "Something went wrong",
    };
    const result = FromWorkerSchema.safeParse(msg);
    expect(result.success).toBe(true);
  });
});
