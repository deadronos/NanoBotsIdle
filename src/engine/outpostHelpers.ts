import type { UiSnapshot } from "../shared/protocol";
import type { Drone, DroneState } from "./drones";
import type { Outpost, WorldModel } from "./world/world";

export const QUEUE_THRESHOLD = 5;
export const REROUTE_COOLDOWN_MS = 5000;

/**
 * Handles logic for a drone requesting to dock at an outpost.
 * - If granted, transitions to DEPOSITING.
 * - If denied, checks queue length and cooldown to decide whether to queue or reroute (RETURNING).
 */
export const handleDockRequest = (world: WorldModel, drone: Drone, outpost: Outpost) => {
  const result = world.requestDock(outpost, drone.id);
  if (result === "GRANTED") {
    drone.state = "DEPOSITING";
    drone.miningTimer = 0;
  } else {
    // Reroute check with cooldown
    const now = Date.now();
    if (
      world.getQueueLength(outpost) > QUEUE_THRESHOLD &&
      (drone.lastRerouteAt ?? 0) + REROUTE_COOLDOWN_MS < now
    ) {
      drone.lastRerouteAt = now;
      drone.state = "RETURNING";
    } else {
      drone.state = "QUEUING";
    }
  }
};

/**
 * Handles logic for a drone depositing its payload.
 * - Increments timer.
 * - Once timer >= 0.5s, transfers credits, logs event, undocks, and transitions to nextState.
 */
export const handleDeposit = (
  world: WorldModel,
  drone: Drone,
  depositEvents: { x: number; y: number; z: number; amount: number }[],
  uiSnapshot: UiSnapshot,
  dtSeconds: number,
  nextState: DroneState,
) => {
  drone.miningTimer += dtSeconds;
  if (drone.miningTimer >= 0.5) {
    uiSnapshot.credits += drone.payload;
    const outpost = world.getNearestOutpost(drone.x, drone.y, drone.z);
    if (outpost) {
      depositEvents.push({
        x: outpost.x,
        y: outpost.y,
        z: outpost.z,
        amount: Math.floor(drone.payload),
      });
      world.undock(outpost, drone.id);
    }
    drone.payload = 0;

    drone.state = nextState;
    drone.miningTimer = 0;
  }
};
