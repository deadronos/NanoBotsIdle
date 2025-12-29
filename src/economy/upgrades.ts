import type { Config } from "../config/index";
import type { UiSnapshot } from "../shared/protocol";

export type UpgradeType = "drone" | "speed" | "move" | "laser";

type UpgradeLevels = Pick<
  UiSnapshot,
  "droneCount" | "miningSpeedLevel" | "moveSpeedLevel" | "laserPowerLevel"
>;

export const getUpgradeCost = (type: UpgradeType, levels: UpgradeLevels, cfg: Config) => {
  const baseCosts = cfg.economy.baseCosts;

  switch (type) {
    case "drone":
      return Math.floor(baseCosts.drone * Math.pow(1.5, levels.droneCount - 3));
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
    speed: getUpgradeCost("speed", levels, cfg),
    move: getUpgradeCost("move", levels, cfg),
    laser: getUpgradeCost("laser", levels, cfg),
  };
};

export const tryBuyUpgrade = (type: UpgradeType, snapshot: UiSnapshot, cfg: Config) => {
  const cost = getUpgradeCost(type, snapshot, cfg);
  if (snapshot.credits < cost) return false;

  snapshot.credits -= cost;

  switch (type) {
    case "drone":
      snapshot.droneCount += 1;
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
