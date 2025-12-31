import { describe, test, expect } from "vitest";
import { tickDrones } from "../src/engine/tickDrones";
import { getConfig } from "../src/config/index";
import type { Drone } from "../src/engine/drones";

describe("tickDrones integration: hauler pickup and deposit", () => {
  test("minedBlocks increments at mine-time and remains unchanged on deposit; hauler picks up and deposits payload", () => {
    const cfg = getConfig();

    const uiSnapshot: any = {
      credits: 0,
      prestigeLevel: 1,
      droneCount: 2,
      haulerCount: 1,
      miningSpeedLevel: 1,
      moveSpeedLevel: 1,
      laserPowerLevel: 1,
      minedBlocks: 0,
      totalBlocks: 0,
      upgrades: {},
      outposts: [{ id: "o1", x: 10, y: 0, z: 10, level: 1 }],
    };

    // Miner positioned at origin and ready to mine
    const miner: Drone = {
      id: 1,
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

    // Hauler positioned near miner so it can fetch within the same tick
    const hauler: Drone = {
      id: 2,
      x: 1,
      y: 0,
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "IDLE",
      miningTimer: 0,
      role: "HAULER",
      payload: 0,
      maxPayload: 50,
    };

    const drones = [miner, hauler];

    const world: any = {
      mineVoxel: (_x: number, _y: number, _z: number) => ({
        edit: { x: 0, y: 0, z: 0, mat: 0 },
        frontierAdded: [],
        frontierRemoved: [],
      }),
      countFrontierAboveWater: () => 0,
      getNearestOutpost: (_x: number, _y: number, _z: number) => ({ id: "o1", x: 10, y: 0, z: 10, level: 1 }),
      key: (_x: number, _y: number, _z: number) => "k-0",
    };

    const minedKeys = new Set<string>();
    const reservedKeys = new Set<string>();
    const minedPositions: number[] = [];
    const editsThisTick: any[] = [];
    const frontierAdded: number[] = [];
    const frontierRemoved: number[] = [];

    // First tick: miner mines and hauler should pick up the payload
    tickDrones({
      world,
      drones,
      dtSeconds: 1.0,
      cfg,
      frontier: { keys: [] } as any,
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
    });

    // After mining, minedBlocks must have incremented
    expect(uiSnapshot.minedBlocks).toBe(1);

    // Miner should have produced payload (>0)
    expect(miner.payload).toBeGreaterThan(0);

    // Hauler may pick up in the same tick or the next tick depending on scheduling.
    if (hauler.payload === 0) {
      // Run one more tick to allow fetch to complete
      tickDrones({
        world,
        drones,
        dtSeconds: 1.0,
        cfg,
        frontier: { keys: [] } as any,
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
      });
    }

    // Hauler should have picked up some payload from miner
    expect(hauler.payload).toBeGreaterThan(0);
    expect(miner.payload).toBeLessThanOrEqual(miner.maxPayload);

    // Save credit amount for comparison after deposit
    const creditsBeforeDeposit = uiSnapshot.credits;

    // Simulate second tick where hauler deposits payload at outpost
    // Place hauler near outpost and set it to DEPOSITING so the deposit occurs
    hauler.x = 10;
    hauler.z = 10;
    hauler.state = "DEPOSITING" as any;
    hauler.miningTimer = 0;

    tickDrones({
      world,
      drones,
      dtSeconds: 0.6, // >= 0.5 to trigger deposit
      cfg,
      frontier: { keys: [] } as any,
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
    });

    // After deposit, credits increased and hauler payload reset
    expect(uiSnapshot.credits).toBeGreaterThan(creditsBeforeDeposit);
    expect(hauler.payload).toBe(0);

    // minedBlocks should NOT have changed on deposit (still the same count from mine-time)
    expect(uiSnapshot.minedBlocks).toBe(1);
  });
});
