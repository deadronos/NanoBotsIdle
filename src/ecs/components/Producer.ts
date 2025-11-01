import type { EntityId } from "../world/EntityId";
import type { Recipe } from "../../types/recipes";

export interface Producer {
  recipe: Recipe;
  progress: number;
  baseRate: number;
  tier: number;
  active: boolean;
}

export type ProducerStore = Record<EntityId, Producer>;
