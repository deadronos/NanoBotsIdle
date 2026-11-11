import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config";
import { handleCommand } from "../src/engine/commands";
import type { EngineContext } from "../src/engine/context";
import type { Drone } from "../src/engine/drones";
import { createKeyIndex } from "../src/engine/keyIndex";
import { tickEngine } from "../src/engine/tick";
import type { WorldModel } from "../src/engine/world/world";
import type { UiSnapshot } from "../src/shared/protocol";

const makeDrone = (id: number, role: Drone["role"], payload: number): Drone => ({
  id,
  role,
  payload,
  x: 0,
  y: 0,
  z: 0,
  state: role === "MINER" ? "SEEKING" : "IDLE",
  maxPayload: 100,
  targetKey: null,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
  miningTimer: 0,
});

const makeContext = () => {
  const cfg = getConfig();
  const uiSnapshot = {
    credits: 1000,
    creditsPerMinute: 0,
    cargoInTransit: 0,
    prestigeLevel: 1,
    droneCount: 1,
    haulerCount: 1,
    miningSpeedLevel: 1,
    moveSpeedLevel: 1,
    laserPowerLevel: 1,
    minedBlocks: cfg.economy.prestigeMinMinedBlocks,
    totalBlocks: 0,
    outposts: [],
  } satisfies UiSnapshot;
  const miner = makeDrone(0, "MINER", 12.5);
  const hauler = makeDrone(1, "HAULER", 0);
  const context = {
    tick: 0,
    elapsedSeconds: 0,
    cfg,
    minedKeys: new Set(),
    reservedKeys: new Set(),
    world: {
      countFrontierAboveWater: () => 0,
      getNearestOutpost: () => null,
      getOutposts: () => [],
    } as unknown as WorldModel,
    frontier: createKeyIndex<number>(),
    pendingFrontierSnapshot: null,
    pendingFrontierReset: false,
    drones: [miner, hauler],
    playerChunksToScan: [],
    uiSnapshot,
    depositIncome: { prestigeLevel: 1, samples: [], total: 0 },
  } satisfies EngineContext;

  return { context, miner, hauler, tick: (dt: number) => tickEngine(context, dt, 8, 1) };
};

describe("engine economy HUD", () => {
  it("counts cargo once through a hauler pickup, then records the exact deposit", () => {
    const { miner, hauler, tick } = makeContext();
    hauler.targetKey = "miner-0";
    hauler.state = "FETCHING";

    const pickup = tick(1);
    expect(hauler.payload).toBe(12.5);
    expect(miner.payload).toBe(0);
    expect(pickup.ui.cargoInTransit).toBe(12.5);
    expect(pickup.ui.creditsPerMinute).toBe(0);

    hauler.state = "DEPOSITING";
    const deposit = tick(0.5);
    expect(deposit.delta.depositEvents).toBeUndefined();
    expect(deposit.ui.cargoInTransit).toBe(0);
    expect(deposit.ui.creditsPerMinute).toBe(12.5);
  });

  it("ignores upgrade spending and expires deposits after a minute", () => {
    const { context, miner, tick } = makeContext();
    miner.state = "DEPOSITING";
    expect(tick(0.5).ui.creditsPerMinute).toBe(12.5);

    handleCommand(context, { t: "BUY_UPGRADE", id: "speed", n: 1 });
    const afterPurchase = tick(59.5).ui;
    expect(afterPurchase.miningSpeedLevel).toBe(2);
    expect(afterPurchase.creditsPerMinute).toBe(12.5);
    expect(tick(0.5).ui.creditsPerMinute).toBe(0);
  });

  it("clears income history and respawns the fleet without old-world cargo on prestige", () => {
    const { context, hauler, miner, tick } = makeContext();
    miner.state = "DEPOSITING";
    expect(tick(0.5).ui.creditsPerMinute).toBe(12.5);

    hauler.state = "DEPOSITING";
    hauler.payload = 25;
    handleCommand(context, { t: "PRESTIGE" });
    const { ui, delta } = tick(0.5);
    expect(ui.prestigeLevel).toBe(2);
    expect(ui.credits).toBe(0);
    expect(ui.creditsPerMinute).toBe(0);
    expect(ui.cargoInTransit).toBe(0);
    expect(context.drones).toHaveLength(2);
    expect(context.drones).not.toContain(hauler);
    expect(delta.entities?.[5]).toBe(delta.outposts?.[0].z);
  });
});
