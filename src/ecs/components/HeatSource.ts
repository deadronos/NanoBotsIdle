import type { EntityId } from "../world/EntityId";

export interface HeatSource {
  heatPerSecond: number;
}

export interface HeatSink {
  coolingPerSecond: number;
}

export type HeatSourceStore = Record<EntityId, HeatSource>;
export type HeatSinkStore = Record<EntityId, HeatSink>;
