import type { Config } from "../config/index";

export type DroneState = "SEEKING" | "MOVING" | "MINING";

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
};

export const syncDroneCount = (drones: Drone[], desiredCount: number, cfg: Config) => {
  if (drones.length === desiredCount) return drones;

  if (drones.length < desiredCount) {
    for (let i = drones.length; i < desiredCount; i += 1) {
      drones.push({
        id: i,
        x: 0,
        y: cfg.drones.startHeightBase + Math.random() * cfg.drones.startHeightRandom,
        z: 0,
        targetKey: null,
        targetX: Number.NaN,
        targetY: Number.NaN,
        targetZ: Number.NaN,
        state: "SEEKING",
        miningTimer: 0,
      });
    }
    return drones;
  }

  return drones.slice(0, desiredCount);
};
