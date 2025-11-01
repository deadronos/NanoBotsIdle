import type { ResourceQuantityMap } from "./resources";

export interface Recipe {
  inputs: ResourceQuantityMap;
  outputs: ResourceQuantityMap;
  baseBatchSize?: number;
}
