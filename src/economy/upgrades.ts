import type { Config } from "../config/index";
import type { UiSnapshot } from "../shared/protocol";

export const UPGRADE_NAMES = {
  drone: "Drone Fleet",
  hauler: "Logistics Hauler",
  speed: "Mining Drill",
  move: "Thrusters",
  laser: "Laser Power",
} as const;

export type UpgradeType = keyof typeof UPGRADE_NAMES;

const upgradeTypes = Object.keys(UPGRADE_NAMES) as UpgradeType[];

type UpgradeLevels = Pick<
  UiSnapshot,
  "droneCount" | "haulerCount" | "miningSpeedLevel" | "moveSpeedLevel" | "laserPowerLevel"
>;

const getUpgradeLevel = (type: UpgradeType, levels: UpgradeLevels) => {
  switch (type) {
    case "drone":
      return levels.droneCount;
    case "hauler":
      return levels.haulerCount;
    case "speed":
      return levels.miningSpeedLevel;
    case "move":
      return levels.moveSpeedLevel;
    case "laser":
      return levels.laserPowerLevel;
  }
};

export const getUpgradeMaxLevel = (type: UpgradeType, cfg: Config) => {
  return cfg.economy.maxLevels[type];
};

export const isUpgradeMaxed = (type: UpgradeType, levels: UpgradeLevels, cfg: Config) => {
  return getUpgradeLevel(type, levels) >= getUpgradeMaxLevel(type, cfg);
};

export const getUpgradeCost = (type: UpgradeType, levels: UpgradeLevels, cfg: Config) => {
  const baseCosts = cfg.economy.baseCosts;

  switch (type) {
    case "drone":
      return Math.floor(baseCosts.drone * Math.pow(1.5, levels.droneCount - 3));
    case "hauler":
      return Math.floor(baseCosts.hauler * Math.pow(1.5, levels.haulerCount));
    case "speed":
      return Math.floor(baseCosts.speed * Math.pow(1.3, levels.miningSpeedLevel - 1));
    case "move":
      return Math.floor(baseCosts.move * Math.pow(1.3, levels.moveSpeedLevel - 1));
    case "laser":
      return Math.floor(baseCosts.laser * Math.pow(1.4, levels.laserPowerLevel - 1));
  }
};

export const computeNextUpgradeCosts = (levels: UpgradeLevels, cfg: Config) => {
  return {
    drone: getUpgradeCost("drone", levels, cfg),
    hauler: getUpgradeCost("hauler", levels, cfg),
    speed: getUpgradeCost("speed", levels, cfg),
    move: getUpgradeCost("move", levels, cfg),
    laser: getUpgradeCost("laser", levels, cfg),
  };
};

export const getCheapestUpgrade = (
  snapshot: UpgradeLevels & Pick<UiSnapshot, "nextCosts">,
  cfg: Config,
): { type: UpgradeType; cost: number } | undefined => {
  const costs = snapshot.nextCosts ?? computeNextUpgradeCosts(snapshot, cfg);
  let cheapest: { type: UpgradeType; cost: number } | undefined;
  for (const type of upgradeTypes) {
    const cost = costs[type];
    if (cost === undefined || isUpgradeMaxed(type, snapshot, cfg)) continue;
    if (!cheapest || cost < cheapest.cost) cheapest = { type, cost };
  }
  return cheapest;
};

export const tryBuyUpgrade = (type: UpgradeType, snapshot: UiSnapshot, cfg: Config) => {
  if (isUpgradeMaxed(type, snapshot, cfg)) return false;

  const cost = getUpgradeCost(type, snapshot, cfg);
  if (snapshot.credits < cost) return false;

  snapshot.credits -= cost;

  switch (type) {
    case "drone":
      snapshot.droneCount += 1;
      return true;
    case "hauler":
      snapshot.haulerCount += 1;
      return true;
    case "speed":
      snapshot.miningSpeedLevel += 1;
      return true;
    case "move":
      snapshot.moveSpeedLevel += 1;
      return true;
    case "laser":
      snapshot.laserPowerLevel += 1;
      return true;
  }
};

export const getPrestigeRequirement = (prestigeLevel: number, cfg: Config) => {
  return Math.floor(
    cfg.economy.prestigeMinMinedBlocks * Math.pow(cfg.economy.prestigeScalingFactor, prestigeLevel - 1),
  );
};
