import { getDroneCargo } from "../config/drones";
import { type Config } from "../config/index";
import type { VoxelKey } from "../shared/voxel";

export type DroneRole = "MINER" | "HAULER";

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

export type DroneTargetKey = VoxelKey | `miner-${number}`;

export type Drone = {
  id: number;
  x: number;
  y: number;
  z: number;
  targetKey: DroneTargetKey | null;
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
  cfg: Config,
  home?: { x: number; y: number; z: number },
) => {
  let miners = drones.filter((d) => d.role === "MINER");
  let haulers = drones.filter((d) => d.role === "HAULER");

  // Remove excess drones if counts decreased
  if (miners.length > minerCount) {
    miners = miners.slice(0, minerCount);
  }
  if (haulers.length > haulerCount) {
    haulers = haulers.slice(0, haulerCount);
  }

  // Find the highest ID currently in use to avoid collisions
  let nextId = drones.reduce((max, d) => Math.max(max, d.id), -1) + 1;

  const homeX = home?.x ?? 0;
  const homeZ = home?.z ?? 0;
  const startHeight = Math.max(cfg.drones.startHeightBase, (home?.y ?? 0) + 6);

  // Add Miners if needed
  while (miners.length < minerCount) {
    miners.push({
      id: nextId++,
      x: homeX + ((miners.length % 3) - 1) * 1.5,
      y: startHeight + Math.random() * cfg.drones.startHeightRandom,
      z: homeZ,
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

  // Add Haulers if needed
  while (haulers.length < haulerCount) {
    haulers.push({
      id: nextId++,
      x: homeX,
      y: startHeight + 5,
      z: homeZ,
      targetKey: null,
      targetX: Number.NaN,
      targetY: Number.NaN,
      targetZ: Number.NaN,
      state: "IDLE",
      miningTimer: 0,
      role: "HAULER",
      payload: 0,
      maxPayload: cfg.drones.haulers.baseCargo,
    });
  }

  return [...miners, ...haulers];
};
