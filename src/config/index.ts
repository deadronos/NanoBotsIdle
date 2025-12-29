import type { PlayerConfig, defaultPlayerConfig } from "./player";
import type { TerrainConfig, defaultTerrainConfig } from "./terrain";
import type { DronesConfig, defaultDronesConfig } from "./drones";
import type { RenderConfig, defaultRenderConfig } from "./render";
import { defaultTerrainConfig as _defaultTerrain } from "./terrain";
import { defaultPlayerConfig as _defaultPlayer } from "./player";
import { defaultDronesConfig as _defaultDrones } from "./drones";
import { defaultRenderConfig as _defaultRender } from "./render";

export type Config = {
  terrain: TerrainConfig;
  player: PlayerConfig;
  drones: DronesConfig;
  render: RenderConfig;
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
  };
  return _config;
};

export default getConfig;
