import { Recipe } from "../../types/buildings";

export interface Producer {
  recipe: Recipe;
  progress: number;  // 0..1 for current batch
  baseRate: number;  // base items per second at tier 1, no heat
  tier: number;      // 1,2,3...
  active: boolean;   // false if starved or unpowered
}
