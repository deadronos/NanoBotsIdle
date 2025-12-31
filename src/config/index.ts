import type { DronesConfig } from "./drones";
import { defaultDronesConfig as _defaultDrones } from "./drones";
import type { EconomyConfig } from "./economy";
import { defaultEconomyConfig as _defaultEconomy } from "./economy";
import type { MeshingConfig } from "./meshing";
import { defaultMeshingConfig as _defaultMeshing } from "./meshing";
import type { PlayerConfig } from "./player";
import { defaultPlayerConfig as _defaultPlayer } from "./player";
import type { RenderConfig } from "./render";
import { defaultRenderConfig as _defaultRender } from "./render";
import type { TelemetryConfig } from "./telemetry";
import { defaultTelemetryConfig as _defaultTelemetry } from "./telemetry";
import type { TerrainConfig } from "./terrain";
import { defaultTerrainConfig as _defaultTerrain } from "./terrain";

export type Config = {
  terrain: TerrainConfig;
  player: PlayerConfig;
  drones: DronesConfig;
  render: RenderConfig;
  economy: EconomyConfig;
  telemetry: TelemetryConfig;
  meshing: MeshingConfig;
};

type ConfigListener = () => void;
const _listeners = new Set<ConfigListener>();

export const subscribeConfig = (listener: ConfigListener) => {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
};

const notifyConfigChanged = () => {
  _listeners.forEach((l) => l());
};

type PlainObject = Record<string, unknown>;
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends PlainObject ? DeepPartial<T[K]> : T[K];
};

const isPlainObject = (value: unknown): value is PlainObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const deepMerge = (a: PlainObject, b: PlainObject): PlainObject => {
  const out = { ...a } as PlainObject;
  (Object.keys(b || {}) as (keyof PlainObject)[]).forEach((key) => {
    const next = b[key];
    if (next === undefined) return;
    const current = a[key];
    if (isPlainObject(current) && isPlainObject(next)) {
      out[key] = deepMerge(current, next);
    } else {
      out[key] = next;
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
  telemetry: _defaultTelemetry,
  meshing: _defaultMeshing,
};

export const getConfig = (): Config => _config;

export const updateConfig = (partial: DeepPartial<Config>) => {
  _config = deepMerge(_config as PlainObject, partial as PlainObject) as Config;
  notifyConfigChanged();
  return _config;
};

export const resetConfig = () => {
  _config = {
    terrain: _defaultTerrain,
    player: _defaultPlayer,
    drones: _defaultDrones,
    render: _defaultRender,
    economy: _defaultEconomy,
    telemetry: _defaultTelemetry,
    meshing: _defaultMeshing,
  };
  notifyConfigChanged();
  return _config;
};

export default getConfig;
