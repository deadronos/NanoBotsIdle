import { getConfig } from "../config/index";

export const getSeed = (prestigeLevel = 1): number => {
  const cfg = getConfig();
  return cfg.terrain.baseSeed + cfg.terrain.prestigeSeedDelta * prestigeLevel;
};
