import { describe, expect, test } from "vitest";

import { getConfig } from "../src/config/index";
import type { Drone } from "../src/engine/drones";
import type { KeyIndex } from "../src/engine/keyIndex";
import { tickDrones } from "../src/engine/tickDrones";
import type { WorldModel } from "../src/engine/world/world";
import type { UiSnapshot, VoxelEdit } from "../src/shared/protocol";

describe("tickDrones minedBlocks tracking", () => {
  test("increments uiSnapshot.minedBlocks when a miner successfully mines a voxel", () => {
    const cfg = getConfig();

    const uiSnapshot: UiSnapshot = {
      credits: 0,
      prestigeLevel: 1,
      droneCount: 1,
      haulerCount: 0,
      miningSpeedLevel: 1,
      moveSpeedLevel: 1,
      laserPowerLevel: 1,
      minedBlocks: 0,
      totalBlocks: 0,
      upgrades: {},
      outposts: [],
    };

    const miner: Drone = {
      id: 0,
      x: 0,
      y: 0,
      z: 0,
      targetKey: "k-0",
      targetX: 0,
      targetY: 10,
      targetZ: 0,
      state: "MINING",
      miningTimer: 0,
      role: "MINER",
      payload: 0,
      maxPayload: 100,
    };

    type WorldStub = {
      mineVoxel: (
        x: number,
        y: number,
        z: number,
      ) => {
        edit: VoxelEdit;
        frontierAdded: { x: number; y: number; z: number }[];
        frontierRemoved: { x: number; y: number; z: number }[];
      } | null;
      countFrontierAboveWater: () => number;
      getNearestOutpost?: (
        x: number,
        y: number,
        z: number,
      ) => { id: string; x: number; y: number; z: number; level: number } | null;
      key: (x: number, y: number, z: number) => string;
    };

    const worldStub: WorldStub = {
      mineVoxel: (_x: number, _y: number, _z: number) => ({
        edit: { x: 0, y: 0, z: 0, mat: 0 },
        frontierAdded: [],
        frontierRemoved: [],
      }),
      countFrontierAboveWater: () => 0,
      getNearestOutpost: () => null,
      key: (_x: number, _y: number, _z: number) => "k-0",
    };

    const world = worldStub as unknown as WorldModel;

    const drones = [miner];
    const minedKeys = new Set<string>();
    const reservedKeys = new Set<string>();
    const minedPositions: number[] = [];
    const editsThisTick: VoxelEdit[] = [];
    const frontierAdded: number[] = [];
    const frontierRemoved: number[] = [];

    const frontier: KeyIndex = { keys: [], index: new Map() };

    // Simulate a full mining tick
    tickDrones({
      world,
      drones,
      dtSeconds: 1.0,
      cfg,
      frontier,
      minedKeys,
      reservedKeys,
      moveSpeed: 1,
      mineDuration: 1.0,
      maxTargetAttempts: 1,
      uiSnapshot,
      minedPositions,
      editsThisTick,
      frontierAdded,
      frontierRemoved,
      depositEvents: [],
    });

    expect(uiSnapshot.minedBlocks).toBe(1);
  });
});
