import type { Position } from "../ecs/components/Position";
import type { EntityId } from "../ecs/world/EntityId";
import type { ResourceName } from "./resources";

export type EntityType =
  | "drone"
  | "building"
  | "resourceNode"
  | "core"
  | "terrain";

export type TaskStatus = "pending" | "assigned" | "completed";

export interface HaulTaskPayload {
  resource: ResourceName;
  amount: number;
  remaining: number;
  sourceId: EntityId;
  destinationId: EntityId;
}

export interface TaskRequest {
  id: string;
  type: "haul";
  payload: HaulTaskPayload;
  assignedTo?: EntityId;
  status: TaskStatus;
}

export type PathRequestStatus = "pending" | "completed" | "failed";

export interface PathRequest {
  id: string;
  entityId: EntityId;
  start: Position;
  goal: Position;
  status: PathRequestStatus;
}

export interface GridData {
  width: number;
  height: number;
  isWalkable(x: number, y: number): boolean;
  getTraversalCost?(x: number, y: number): number;
}
