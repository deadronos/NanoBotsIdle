import type { PlayerConfig, defaultPlayerConfig } from "./player";
import type { TerrainConfig, defaultTerrainConfig } from "./terrain";
import { defaultTerrainConfig as _defaultTerrain } from "./terrain";
import { defaultPlayerConfig as _defaultPlayer } from "./player";

export type Config = {
  terrain: TerrainConfig;
  player: PlayerConfig;
};

const deepMerge = (a: any, b: any) => {
  const out = { ...a };
  Object.keys(b || {}).forEach((k) => {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k]) {
      out[k] = deepMerge(a[k], b[k]);
    } else {
      out[k] = b[k];
    }
  });
  return out;
};

let _config: Config = {
  terrain: _defaultTerrain,
  player: _defaultPlayer,
};

export const getConfig = (): Config => _config;

export const updateConfig = (partial: Partial<Config>) => {
  _config = deepMerge(_config, partial);
  return _config;
};

export const resetConfig = () => {
  _config = { terrain: _defaultTerrain, player: _defaultPlayer };
  return _config;
};

export default getConfig;
