import { getDroneCargo } from "../config/drones";
import { type Config } from "../config/index";

export type DroneRole = "MINER" | "HAULER" | "DIVER";

export type DroneState =
  | "IDLE" // Hauler waiting
  | "SEEKING"
  | "MOVING"
  | "MINING"
  | "RETURNING"
  | "DEPOSITING"
  | "WAITING_PICKUP"
  | "FETCHING" // Hauler only
  | "TRANSFER" // Hauler only
  | "QUEUING";

export type Drone = {
  id: number;
  x: number;
  y: number;
  z: number;
  targetKey: string | null;
  targetX: number;
  targetY: number;
  targetZ: number;
  state: DroneState;
  miningTimer: number;
  role: DroneRole;
  payload: number;
  maxPayload: number;
  // Timestamp (ms) of the last time this drone attempted a reroute to avoid thrashing
  lastRerouteAt?: number;
};

export const syncDroneCount = (
  drones: Drone[],
  minerCount: number,
  haulerCount: number,
  diverCount: number,
  cfg: Config,
) => {
  let miners = drones.filter((d) => d.role === "MINER");
  let haulers = drones.filter((d) => d.role === "HAULER");
  let divers = drones.filter((d) => d.role === "DIVER");

  // Sync Miners
  if (miners.length < minerCount) {
    const needed = minerCount - miners.length;
    let nextId = drones.length > 0 ? Math.max(...drones.map((d) => d.id)) + 1 : 0;
    for (let i = 0; i < needed; i++) {
      miners.push({
        id: nextId++,
        x: 0,
        y: cfg.drones.startHeightBase + Math.random() * cfg.drones.startHeightRandom,
        z: 0,
        targetKey: null,
        targetX: Number.NaN,
        targetY: Number.NaN,
        targetZ: Number.NaN,
        state: "SEEKING",
        miningTimer: 0,
        role: "MINER",
        payload: 0,
        maxPayload: getDroneCargo(0, cfg),
      });
    }
  } else if (miners.length > minerCount) {
    miners = miners.slice(0, minerCount);
  }

  // Sync Haulers
  if (haulers.length < haulerCount) {
    const _needed = haulerCount - haulers.length;
    const _nextId = drones.length > 0 ? Math.max(...drones.map((d) => d.id)) + 1 : 0;
    // Ensure we don't collide with new miners logic (re-calculating nextId risk? No, I separated logic.)
    // Actually nextId logic checks 'drones', which is the OLD list.
    // If I added miners above, they are not in 'drones' yet.
    // I should calculate maxId dynamically or track it.
    // Better: Helper function.
  } else if (haulers.length > haulerCount) {
    haulers = haulers.slice(0, haulerCount);
  }

  // Correct implementation merging both
  const nextDrones = [...miners, ...haulers, ...divers];

  // Fill Haulers
  while (nextDrones.filter((d) => d.role === "HAULER").length < haulerCount) {
    const maxId = nextDrones.length > 0 ? Math.max(...nextDrones.map((d) => d.id)) : -1;
    nextDrones.push({
      id: maxId + 1,
      x: 0,
      y: 20, // Fly higher?
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "IDLE" as DroneState, // Default state for Hauler
      miningTimer: 0,
      role: "HAULER",
      payload: 0,
      maxPayload: cfg.drones.haulers.baseCargo, // Use config
    });
  }

  // Fill Divers
  while (nextDrones.filter((d) => d.role === "DIVER").length < diverCount) {
    const maxId = nextDrones.length > 0 ? Math.max(...nextDrones.map((d) => d.id)) : -1;
    nextDrones.push({
      id: maxId + 1,
      x: 0,
      y: cfg.terrain.waterLevel - 5 - Math.random() * 10, // Spawn underwater
      z: 0,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "SEEKING" as DroneState,
      miningTimer: 0,
      role: "DIVER",
      payload: 0,
      maxPayload: cfg.drones.divers.baseCargo,
    });
  }

  // Remove excess drones if counts decreased
  const finalDrones = [
    ...nextDrones.filter((d) => d.role === "MINER").slice(0, minerCount),
    ...nextDrones.filter((d) => d.role === "HAULER").slice(0, haulerCount),
    ...nextDrones.filter((d) => d.role === "DIVER").slice(0, diverCount),
  ];

  return finalDrones;
};
