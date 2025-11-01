import type { EntityId } from "../world/EntityId";

export interface Path {
  nodes: Array<{ x: number; y: number }>;
  progress: number;
  goal: { x: number; y: number };
}

export type PathStore = Record<EntityId, Path>;
