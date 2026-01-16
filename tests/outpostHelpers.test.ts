import { describe, expect, test, vi } from "vitest";

import type { Drone, DroneState } from "../src/engine/drones";
import { handleDeposit, handleDockRequest, QUEUE_THRESHOLD, REROUTE_COOLDOWN_MS } from "../src/engine/outpostHelpers";
import type { Outpost, WorldModel } from "../src/engine/world/world";
import type { UiSnapshot } from "../src/shared/protocol";

const createMockDrone = (state: DroneState, role: "MINER" | "HAULER" = "MINER"): Drone => ({
  id: 1,
  x: 0,
  y: 0,
  z: 0,
  targetKey: null,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
  state,
  miningTimer: 0,
  role,
  payload: 10,
  maxPayload: 100,
});

const createMockOutpost = (id = "outpost-1"): Outpost => ({
  id,
  x: 10,
  y: 0,
  z: 0,
  level: 1,
  docked: new Set(),
  queue: [],
});

describe("handleDockRequest", () => {
  test("transitions to DEPOSITING if dock is GRANTED", () => {
    const world = {
      requestDock: vi.fn(() => "GRANTED"),
      getQueueLength: vi.fn(() => 0),
    } as unknown as WorldModel;
    const drone = createMockDrone("RETURNING");
    const outpost = createMockOutpost();

    handleDockRequest(world, drone, outpost);

    expect(world.requestDock).toHaveBeenCalledWith(outpost, drone.id);
    expect(drone.state).toBe("DEPOSITING");
    expect(drone.miningTimer).toBe(0);
  });

  test("stays in QUEUING/RETURNING -> QUEUING if dock is DENIED/QUEUED and threshold not met", () => {
    const world = {
      requestDock: vi.fn(() => "QUEUED"),
      getQueueLength: vi.fn(() => QUEUE_THRESHOLD), // Not exceeding
    } as unknown as WorldModel;
    const drone = createMockDrone("RETURNING");
    const outpost = createMockOutpost();

    handleDockRequest(world, drone, outpost);

    expect(drone.state).toBe("QUEUING");
  });

  test("reroutes to RETURNING if queue threshold exceeded and cooldown expired", () => {
    const world = {
      requestDock: vi.fn(() => "QUEUED"),
      getQueueLength: vi.fn(() => QUEUE_THRESHOLD + 1),
    } as unknown as WorldModel;
    const drone = createMockDrone("RETURNING");
    drone.lastRerouteAt = 0; // Expired
    const outpost = createMockOutpost();

    // Mock Date.now to be > REROUTE_COOLDOWN_MS
    const now = REROUTE_COOLDOWN_MS + 100;
    vi.spyOn(Date, "now").mockReturnValue(now);

    handleDockRequest(world, drone, outpost);

    expect(drone.state).toBe("RETURNING");
    expect(drone.lastRerouteAt).toBe(now);

    vi.restoreAllMocks();
  });

  test("stays QUEUING if queue threshold exceeded but cooldown active", () => {
    const world = {
      requestDock: vi.fn(() => "QUEUED"),
      getQueueLength: vi.fn(() => QUEUE_THRESHOLD + 1),
    } as unknown as WorldModel;
    const now = 10000;
    const drone = createMockDrone("RETURNING");
    drone.lastRerouteAt = now - 100; // Active
    const outpost = createMockOutpost();

    vi.spyOn(Date, "now").mockReturnValue(now);

    handleDockRequest(world, drone, outpost);

    expect(drone.state).toBe("QUEUING");

    vi.restoreAllMocks();
  });
});

describe("handleDeposit", () => {
  test("increments timer but does nothing else if timer < 0.5", () => {
    const world = {} as unknown as WorldModel;
    const drone = createMockDrone("DEPOSITING");
    drone.miningTimer = 0;
    const depositEvents: { x: number; y: number; z: number; amount: number }[] =
      [];
    const uiSnapshot = { credits: 0 } as UiSnapshot;

    handleDeposit(world, drone, depositEvents, uiSnapshot, 0.4, "SEEKING");

    expect(drone.miningTimer).toBe(0.4);
    expect(drone.payload).toBe(10);
    expect(uiSnapshot.credits).toBe(0);
    expect(drone.state).toBe("DEPOSITING");
  });

  test("deposits payload and undocks when timer >= 0.5", () => {
    const outpost = createMockOutpost();
    const world = {
      getNearestOutpost: vi.fn(() => outpost),
      undock: vi.fn(),
    } as unknown as WorldModel;
    const drone = createMockDrone("DEPOSITING");
    drone.miningTimer = 0.4;
    drone.payload = 50;
    const depositEvents: { x: number; y: number; z: number; amount: number }[] =
      [];
    const uiSnapshot = { credits: 0 } as UiSnapshot;

    handleDeposit(world, drone, depositEvents, uiSnapshot, 0.2, "SEEKING"); // 0.4 + 0.2 = 0.6

    expect(uiSnapshot.credits).toBe(50);
    expect(drone.payload).toBe(0);
    expect(drone.state).toBe("SEEKING");
    expect(drone.miningTimer).toBe(0);
    expect(world.undock).toHaveBeenCalledWith(outpost, drone.id);
    expect(depositEvents).toHaveLength(1);
    expect(depositEvents[0]).toEqual({
      x: outpost.x,
      y: outpost.y,
      z: outpost.z,
      amount: 50,
    });
  });
});
