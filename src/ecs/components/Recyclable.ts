import { ResourceName } from "../../types/resources";

/**
 * Component for entities that can be recycled/scrapped for resources
 */
export interface Recyclable {
  refundFraction: number; // What fraction of build cost is returned (e.g., 0.5 = 50%)
  refundToFabricator: boolean; // If true, resources go to Fabricator, else to Core
  buildCost: Partial<Record<ResourceName, number>>; // Original build cost
}
