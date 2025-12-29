export type TerrainConfig = {
  baseSeed: number;
  prestigeSeedDelta: number;
  worldRadius: number;
  surfaceBias: number;
  quantizeScale: number;
  waterLevel: number;
};

export const defaultTerrainConfig: TerrainConfig = {
  baseSeed: 123,
  prestigeSeedDelta: 99,
  worldRadius: 30,
  surfaceBias: 0.6,
  quantizeScale: 4,
  waterLevel: 0.2,
};
