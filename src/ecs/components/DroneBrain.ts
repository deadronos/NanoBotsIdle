import type { EntityId } from "../world/EntityId";

export type DroneRole = "hauler" | "builder" | "maintainer";
export type DroneState = "idle" | "toPickup" | "toDropoff";

export interface DroneBrain {
  role: DroneRole;
  state: DroneState;
  currentTaskId?: string;
  pendingPathId?: string;
  moveProgress: number;
  speed: number;
}

export type DroneBrainStore = Record<EntityId, DroneBrain>;
