import { describe, expect, it } from "vitest";

import { createWorld, allocateEntityId } from "../world/createWorld";
import { createUISnapshotSystem, snapshotForWorld } from "./uiSnapshotSystem";

const createSampleWorld = () => {
  const world = createWorld();

  const coreId = allocateEntityId(world);
  world.entityType[coreId] = "core";
  world.position[coreId] = { x: 0, y: 0 };
  world.powerLink[coreId] = { demand: 1, priority: 1, online: true };
  world.heatSource[coreId] = { heatPerSecond: 0.5 };

  const droneId = allocateEntityId(world);
  world.entityType[droneId] = "drone";
  world.position[droneId] = { x: 10, y: 5 };
  world.droneBrain[droneId] = {
    role: "hauler",
    state: "idle",
    moveProgress: 0,
    speed: 1,
  };

  world.globals.heatCurrent = 45;
  world.globals.heatSafeCap = 100;
  world.globals.powerAvailable = 8;
  world.globals.powerDemand = 6;
  world.globals.throughputPerSec = 12;
  world.globals.projectedShards = 0.5;
  world.globals.simTimeSeconds = 90;

  world.taskRequests.push({
    id: "t1",
    type: "haul",
    status: "pending",
    payload: {
      resource: "Carbon",
      amount: 3,
      remaining: 3,
      sourceId: coreId,
      destinationId: coreId,
    },
  });

  return world;
};

describe("uiSnapshotSystem", () => {
  it("builds a snapshot with expected derived values", () => {
    const world = createSampleWorld();
    const snapshots: unknown[] = [];
    const system = createUISnapshotSystem({
      publish: (snapshot) => snapshots.push(snapshot),
    });

    system.update(world, 0);

    expect(snapshots).toHaveLength(1);
    const snapshot = snapshots[0] as ReturnType<typeof snapshotForWorld>;

    expect(snapshot.heatCurrent).toBeCloseTo(45);
    expect(snapshot.heatRatio).toBeCloseTo(0.45);
    expect(snapshot.powerAvailable).toBe(8);
    expect(snapshot.powerDemand).toBe(6);
    expect(snapshot.throughput).toBe(12);
    expect(snapshot.projectedShards).toBeCloseTo(0.5);
    expect(snapshot.currentPhase).toBe(1);
    expect(snapshot.overclockEnabled).toBe(false);
    expect(snapshot.canFork).toBe(false);
    expect(snapshot.bottlenecks).toContain("1 logistics task(s) pending");
    expect(snapshot.drones).toEqual([
      expect.objectContaining({ id: expect.any(Number), role: "hauler" }),
    ]);
    expect(snapshot.buildings).toEqual([
      expect.objectContaining({ type: "Core", online: true }),
    ]);
  });

  it("throttles publishes to configured rate", () => {
    const world = createSampleWorld();
    const publishes: number[] = [];
    const system = createUISnapshotSystem({
      rateHz: 2, // 2 Hz => every 0.5s
      publish: () => {
        publishes.push(world.globals.simTimeSeconds);
      },
    });

    system.update(world, 0); // immediate publish
    expect(publishes).toHaveLength(1);

    world.globals.simTimeSeconds += 0.1;
    system.update(world, 0.1); // not enough time elapsed
    expect(publishes).toHaveLength(1);

    world.globals.simTimeSeconds += 0.4;
    system.update(world, 0.4); // crosses interval => publish
    expect(publishes).toHaveLength(2);

    world.globals.simTimeSeconds += 0.25;
    system.update(world, 0.25); // still below interval
    expect(publishes).toHaveLength(2);

    world.globals.simTimeSeconds += 0.3;
    system.update(world, 0.3); // publish again
    expect(publishes).toHaveLength(3);
  });
});
