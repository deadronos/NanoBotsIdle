import { ResourceName } from "../../types/resources";

export interface Inventory {
  capacity: number;
  contents: Partial<Record<ResourceName, number>>;
}
