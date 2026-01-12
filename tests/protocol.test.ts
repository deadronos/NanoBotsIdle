import { describe, expect, it } from "vitest";

import type { Cmd, FromWorker, ToWorker } from "../src/shared/protocol";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isSerializable = (value: unknown): boolean => {
  if (value === null) return true;
  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") return true;
  if (Array.isArray(value)) return value.every(isSerializable);
  if (ArrayBuffer.isView(value)) return true;
  if (value instanceof ArrayBuffer) return true;
  if (isPlainObject(value)) {
    return Object.values(value).every(isSerializable);
  }
  return false;
};

describe("protocol payloads", () => {
  it("uses only serializable data structures", () => {
    const cmd: Cmd = { t: "BUY_UPGRADE", id: "drone", n: 1 };
    const toWorker: ToWorker = {
      t: "STEP",
      frameId: 1,
      nowMs: 1000,
      budgetMs: 8,
      maxSubsteps: 4,
      cmds: [cmd],
    };
    const fromWorker: FromWorker = {
      t: "FRAME",
      frameId: 1,
      delta: {
        tick: 1,
        entities: new Float32Array([0, 1, 2]),
        entityTargets: new Float32Array([1, 2, 3]),
        entityStates: new Uint8Array([1]),
        edits: [{ x: 0, y: 1, z: 2, mat: 1 }],
        frontierAdd: new Float32Array([0, 0, 0]),
        frontierRemove: new Float32Array([1, 1, 1]),
        frontierReset: true,
        effects: [{ kind: "beam", fromId: 1, toX: 0, toY: 1, toZ: 2, ttl: 0.5 }],
      },
      ui: {
        credits: 0,
        prestigeLevel: 1,
        droneCount: 0,
        haulerCount: 0,
        diverCount: 0,
        miningSpeedLevel: 1,
        moveSpeedLevel: 1,
        laserPowerLevel: 1,
        minedBlocks: 0,
        totalBlocks: 0,
        upgrades: {},
        outposts: [],
        nextCosts: { drone: 100 },
      },
      stats: { simMs: 0.1, backlog: 0 },
    };

    expect(isSerializable(toWorker)).toBe(true);
    expect(isSerializable(fromWorker)).toBe(true);
  });

  it("rejects class instances in payloads", () => {
    class FakeVector {
      x = 1;
      y = 2;
    }

    expect(isSerializable(new FakeVector())).toBe(false);
  });
});
