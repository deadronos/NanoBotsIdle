export type BuildCost = Record<string, number>;

export const BUILD_COSTS: Record<string, BuildCost> = {
  extractor: { Components: 1 },
  assembler: { Components: 2, Carbon: 1 },
  fabricator: { Components: 3, DroneFrame: 1 },
  cooler: { Components: 1 },
  storage: { Components: 1 },
  core: { Components: 5 },
};

export const getBuildCost = (type: string): BuildCost =>
  BUILD_COSTS[type?.toLowerCase() ?? ""] ?? {};

export default BUILD_COSTS;

export interface UpgradeCost {
  shards?: number;
  forkPoints?: number;
  tree?: "swarm" | "bio" | "compiler";
}

export const UPGRADE_COSTS: Record<string, UpgradeCost> = {
  tier: { shards: 2, tree: "compiler" },
  throughput: { shards: 1, tree: "compiler" },
};

export const getUpgradeCost = (upgradeId: string): UpgradeCost =>
  UPGRADE_COSTS[upgradeId?.toLowerCase() ?? ""] ?? {};
