import type {DronesConfig } from "./drones";
import { defaultDronesConfig as _defaultDrones } from "./drones";
import type {PlayerConfig } from "./player";
import { defaultPlayerConfig as _defaultPlayer } from "./player";
import type {RenderConfig } from "./render";
import { defaultRenderConfig as _defaultRender } from "./render";
import type {TerrainConfig } from "./terrain";
import { defaultTerrainConfig as _defaultTerrain } from "./terrain";

export type Config = {
  terrain: TerrainConfig;
  player: PlayerConfig;
  drones: DronesConfig;
  render: RenderConfig;
  economy: EconomyConfig;
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
  drones: _defaultDrones,
  render: _defaultRender,
  economy: _defaultEconomy,
};

export const getConfig = (): Config => _config;

export const updateConfig = (partial: Partial<Config>) => {
  _config = deepMerge(_config, partial);
  return _config;
};

export const resetConfig = () => {
  _config = {
    terrain: _defaultTerrain,
    player: _defaultPlayer,
    drones: _defaultDrones,
    render: _defaultRender,
    economy: _defaultEconomy,
  };
  return _config;
};

export default getConfig;
import type { EconomyConfig } from "./economy";
import { defaultEconomyConfig as _defaultEconomy } from "./economy";
