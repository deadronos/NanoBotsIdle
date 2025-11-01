import type { EntityId } from "../world/EntityId";
import type { ResourceQuantityMap } from "../../types/resources";

export interface Inventory {
  capacity: number;
  contents: ResourceQuantityMap;
}

export type InventoryStore = Record<EntityId, Inventory>;
