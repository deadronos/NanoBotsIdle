import type { EntityId } from "../world/EntityId";

export interface Overclockable {
  overclockLevel: number;
  maxLevel: number;
}

export type OverclockableStore = Record<EntityId, Overclockable>;
