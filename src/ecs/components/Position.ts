import type { EntityId } from "../world/EntityId";

export interface Position {
  x: number;
  y: number;
}

export type PositionStore = Record<EntityId, Position>;
