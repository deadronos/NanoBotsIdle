import { ResourceName } from "./resources";

export type BuildingType =
  | "Core"
  | "Extractor"
  | "Assembler"
  | "Fabricator"
  | "Storage"
  | "PowerVein"
  | "Cooler"
  | "CoreCompiler";

// A crafting recipe for Producer buildings
export interface Recipe {
  inputs: Partial<Record<ResourceName, number>>;
  outputs: Partial<Record<ResourceName, number>>;
  batchTimeSeconds: number;
}
