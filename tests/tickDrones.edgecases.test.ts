import { beforeEach, describe, expect, it, vi } from "vitest";

const { pickTargetKeyMock, getVoxelValueFromHeightMock } = vi.hoisted(() => {
  return {
    pickTargetKeyMock: vi.fn(),
    getVoxelValueFromHeightMock: vi.fn(),
  };
});

vi.mock("../src/engine/targeting", () => {
  return {
    pickTargetKey: pickTargetKeyMock,
  };
});

import type * as TerrainCoreType from "../src/sim/terrain-core";
type TerrainCore = typeof TerrainCoreType;
vi.mock("../src/sim/terrain-core", async () => {
  const actual = await vi.importActual<TerrainCore>("../src/sim/terrain-core");
  return {
    ...actual,
    getVoxelValueFromHeight: getVoxelValueFromHeightMock,
  };
});

import { getConfig } from "../src/config/index";
import type { Drone } from "../src/engine/drones";
import type { KeyIndex } from "../src/engine/keyIndex";
import { tickDrones } from "../src/engine/tickDrones";
import type { WorldModel } from "../src/engine/world/world";
import type { UiSnapshot, VoxelEdit } from "../src/shared/protocol";

const makeUiSnapshot = (overrides?: Partial<UiSnapshot>): UiSnapshot => {
  return {
    credits: 0,
    prestigeLevel: 1,
    droneCount: 0,
    haulerCount: 0,
    miningSpeedLevel: 1,
    moveSpeedLevel: 1,
    laserPowerLevel: 1,
    minedBlocks: 0,
    totalBlocks: 0,
    upgrades: {},
    outposts: [],
    ...overrides,
  };
};

describe("tickDrones edge cases", () => {
  beforeEach(() => {
    pickTargetKeyMock.mockReset();
    getVoxelValueFromHeightMock.mockReset();
    getVoxelValueFromHeightMock.mockReturnValue(10);
  });

  it("MINER SEEKING -> MOVING when a target is picked", () => {
    const cfg = getConfig();
    pickTargetKeyMock.mockReturnValue("k1");

    const miner: Drone = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "SEEKING",
      miningTimer: 0,
      role: "MINER",
      payload: 0,
      maxPayload: 100,
    };

    const world = {
      coordsFromKey: () => ({ x: 1, y: 2, z: 3 }),
      countFrontierAboveWater: () => 123,
      mineVoxel: () => null,
      getNearestOutpost: () => null,
      key: (_x: number, _y: number, _z: number) => "k",
    } as unknown as WorldModel;

    const uiSnapshot = makeUiSnapshot();
    const frontier: KeyIndex = { keys: ["k1"], index: new Map([["k1", 0]]) };

    tickDrones({
      world,
      drones: [miner],
      dtSeconds: 0.016,
      cfg,
      frontier,
      minedKeys: new Set(),
      reservedKeys: new Set(),
      moveSpeed: 10,
      mineDuration: 1,
      maxTargetAttempts: 10,
      uiSnapshot,
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(miner.state).toBe("MOVING");
    expect(miner.targetKey).toBe("k1");
    expect(miner.targetX).toBe(1);
    expect(miner.targetY).toBe(2);
    expect(miner.targetZ).toBe(3);
    expect(uiSnapshot.totalBlocks).toBe(123);
  });

  it("MINER MOVING -> MINING when already within threshold", () => {
    const cfg = getConfig();
    const miner: Drone = {
      id: 1,
      x: 0,
      y: 2,
      z: 0,
      targetKey: "k1",
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      state: "MOVING",
      miningTimer: 999,
      role: "MINER",
      payload: 0,
      maxPayload: 100,
    };

    const world = {
      coordsFromKey: () => ({ x: 0, y: 0, z: 0 }),
      countFrontierAboveWater: () => 0,
      mineVoxel: () => null,
      getNearestOutpost: () => null,
      key: (_x: number, _y: number, _z: number) => "k",
    } as unknown as WorldModel;

    tickDrones({
      world,
      drones: [miner],
      dtSeconds: 0.016,
      cfg,
      frontier: { keys: [], index: new Map() },
      minedKeys: new Set(),
      reservedKeys: new Set(),
      moveSpeed: 10,
      mineDuration: 1,
      maxTargetAttempts: 10,
      uiSnapshot: makeUiSnapshot(),
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(miner.state).toBe("MINING");
    expect(miner.miningTimer).toBe(0);
  });

  it("MINER MINING does nothing until mineDuration is reached", () => {
    const cfg = getConfig();
    const mineSpy = vi.fn(() => null);

    const miner: Drone = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      targetKey: "k1",
      targetX: 0,
      targetY: 10,
      targetZ: 0,
      state: "MINING",
      miningTimer: 0,
      role: "MINER",
      payload: 0,
      maxPayload: 100,
    };

    const world = {
      mineVoxel: mineSpy,
      countFrontierAboveWater: () => 0,
      getNearestOutpost: () => null,
      key: (_x: number, _y: number, _z: number) => "k",
    } as unknown as WorldModel;

    tickDrones({
      world,
      drones: [miner],
      dtSeconds: 0.25,
      cfg,
      frontier: { keys: [], index: new Map() },
      minedKeys: new Set(),
      reservedKeys: new Set(),
      moveSpeed: 10,
      mineDuration: 1,
      maxTargetAttempts: 10,
      uiSnapshot: makeUiSnapshot(),
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(mineSpy).not.toHaveBeenCalled();
    expect(miner.state).toBe("MINING");
    expect(miner.miningTimer).toBeCloseTo(0.25);
  });

  it("MINER MINING clears targetKey and returns to SEEKING if target already mined", () => {
    const cfg = getConfig();
    const mineSpy = vi.fn(() => null);
    const minedKeys = new Set<string>(["k1"]);
    const reservedKeys = new Set<string>(["k1"]);

    const miner: Drone = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      targetKey: "k1",
      targetX: 0,
      targetY: 10,
      targetZ: 0,
      state: "MINING",
      miningTimer: 0,
      role: "MINER",
      payload: 0,
      maxPayload: 100,
    };

    const world = {
      mineVoxel: mineSpy,
      countFrontierAboveWater: () => 0,
      getNearestOutpost: () => null,
      key: (_x: number, _y: number, _z: number) => "k",
    } as unknown as WorldModel;

    tickDrones({
      world,
      drones: [miner],
      dtSeconds: 1.0,
      cfg,
      frontier: { keys: [], index: new Map() },
      minedKeys,
      reservedKeys,
      moveSpeed: 10,
      mineDuration: 0.1,
      maxTargetAttempts: 10,
      uiSnapshot: makeUiSnapshot(),
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(mineSpy).not.toHaveBeenCalled();
    expect(miner.state).toBe("SEEKING");
    expect(miner.targetKey).toBeNull();
    // reservedKeys is only cleared on successful mine
    expect(reservedKeys.has("k1")).toBe(true);
  });

  it("MINER MINING -> RETURNING when payload reaches maxPayload and tracks frontier changes", () => {
    const cfg = getConfig();
    const uiSnapshot = makeUiSnapshot({ prestigeLevel: 2 });

    const miner: Drone = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      targetKey: "k1",
      targetX: 1,
      targetY: 10,
      targetZ: 3,
      state: "MINING",
      miningTimer: 0,
      role: "MINER",
      payload: 0,
      maxPayload: 1,
    };

    const edit: VoxelEdit = { x: 1, y: 10, z: 3, mat: 0 };
    const world = {
      mineVoxel: () => ({
        edit,
        frontierAdded: [{ x: 9, y: 9, z: 9 }],
        frontierRemoved: [{ x: 5, y: 5, z: 5 }],
      }),
      countFrontierAboveWater: () => 42,
      getNearestOutpost: () => null,
      key: (x: number, y: number, z: number) => `k-${x},${y},${z}`,
    } as unknown as WorldModel;

    const minedKeys = new Set<string>();
    const reservedKeys = new Set<string>(["k1"]);
    const frontier: KeyIndex = { keys: ["k-5,5,5"], index: new Map([["k-5,5,5", 0]]) };
    const minedPositions: number[] = [];
    const editsThisTick: VoxelEdit[] = [];
    const frontierAdded: number[] = [];
    const frontierRemoved: number[] = [];

    tickDrones({
      world,
      drones: [miner],
      dtSeconds: 1.0,
      cfg,
      frontier,
      minedKeys,
      reservedKeys,
      moveSpeed: 10,
      mineDuration: 0.1,
      maxTargetAttempts: 10,
      uiSnapshot,
      minedPositions,
      editsThisTick,
      frontierAdded,
      frontierRemoved,
    });

    expect(minedKeys.has("k1")).toBe(true);
    expect(reservedKeys.has("k1")).toBe(false);
    expect(minedPositions).toEqual([1, 10, 3]);
    expect(editsThisTick).toEqual([edit]);
    expect(frontierAdded).toEqual([9, 9, 9]);
    expect(frontierRemoved).toEqual([5, 5, 5]);
    expect(frontier.keys).toContain("k-9,9,9");
    expect(frontier.index.has("k-5,5,5")).toBe(false);
    expect(uiSnapshot.minedBlocks).toBe(1);
    expect(miner.payload).toBeGreaterThanOrEqual(1);
    expect(miner.state).toBe("RETURNING");
    expect(miner.targetKey).toBeNull();
    expect(uiSnapshot.totalBlocks).toBe(42);
  });

  it("MINER RETURNING -> SEEKING when payload is gone (hauler intercept)", () => {
    const cfg = getConfig();
    const miner: Drone = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "RETURNING",
      miningTimer: 0,
      role: "MINER",
      payload: 0,
      maxPayload: 100,
    };

    const world = {
      countFrontierAboveWater: () => 0,
      getNearestOutpost: () => null,
    } as unknown as WorldModel;

    tickDrones({
      world,
      drones: [miner],
      dtSeconds: 1.0,
      cfg,
      frontier: { keys: [], index: new Map() },
      minedKeys: new Set(),
      reservedKeys: new Set(),
      moveSpeed: 10,
      mineDuration: 1,
      maxTargetAttempts: 10,
      uiSnapshot: makeUiSnapshot(),
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(miner.state).toBe("SEEKING");
  });

  it("MINER DEPOSITING converts payload to credits and resumes SEEKING", () => {
    const cfg = getConfig();
    const uiSnapshot = makeUiSnapshot({ credits: 1 });
    const miner: Drone = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "DEPOSITING",
      miningTimer: 0.4,
      role: "MINER",
      payload: 10,
      maxPayload: 100,
    };

    const world = {
      countFrontierAboveWater: () => 0,
      getNearestOutpost: () => ({ id: "o1", x: 0, y: 0, z: 0, level: 1 }),
    } as unknown as WorldModel;

    tickDrones({
      world,
      drones: [miner],
      dtSeconds: 0.2,
      cfg,
      frontier: { keys: [], index: new Map() },
      minedKeys: new Set(),
      reservedKeys: new Set(),
      moveSpeed: 10,
      mineDuration: 1,
      maxTargetAttempts: 10,
      uiSnapshot,
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(uiSnapshot.credits).toBe(11);
    expect(miner.payload).toBe(0);
    expect(miner.state).toBe("SEEKING");
    expect(miner.miningTimer).toBe(0);
  });

  it("HAULER IDLE chooses best miner target and can transfer payload", () => {
    const cfg = getConfig();
    const uiSnapshot = makeUiSnapshot({ moveSpeedLevel: 1, credits: 0 });

    const minerA: Drone = {
      id: 10,
      x: 0,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "SEEKING",
      miningTimer: 0,
      role: "MINER",
      payload: 100,
      maxPayload: 100,
    };

    const minerB: Drone = {
      id: 11,
      x: 0,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "RETURNING",
      miningTimer: 0,
      role: "MINER",
      payload: 80,
      maxPayload: 100,
    };

    const hauler: Drone = {
      id: 2,
      x: 0,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "IDLE",
      miningTimer: 0,
      role: "HAULER",
      payload: 4,
      maxPayload: 5,
    };

    const world = {
      countFrontierAboveWater: () => 0,
      getNearestOutpost: () => ({ id: "o1", x: 0, y: 0, z: 0, level: 1 }),
    } as unknown as WorldModel;

    const drones = [minerA, minerB, hauler];

    // Tick 1: select target (should pick minerB due to RETURNING score multiplier)
    tickDrones({
      world,
      drones,
      dtSeconds: 0.016,
      cfg,
      frontier: { keys: [], index: new Map() },
      minedKeys: new Set(),
      reservedKeys: new Set(),
      moveSpeed: 10,
      mineDuration: 1,
      maxTargetAttempts: 10,
      uiSnapshot,
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(hauler.state).toBe("FETCHING");
    expect(hauler.targetKey).toBe("miner-11");

    // Tick 2: fetch/transfer in-range (dist=0), should take 1 and become full -> RETURNING
    tickDrones({
      world,
      drones,
      dtSeconds: 1.0,
      cfg,
      frontier: { keys: [], index: new Map() },
      minedKeys: new Set(),
      reservedKeys: new Set(),
      // Keep miner positions stable so the hauler stays within the <3 transfer threshold.
      moveSpeed: 0,
      mineDuration: 1,
      maxTargetAttempts: 10,
      uiSnapshot,
      minedPositions: [],
      editsThisTick: [],
      frontierAdded: [],
      frontierRemoved: [],
    });

    expect(hauler.payload).toBe(5);
    expect(minerB.payload).toBe(79);
    expect(hauler.state).toBe("RETURNING");
    expect(hauler.targetKey).toBeNull();
  });
});
