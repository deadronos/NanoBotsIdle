export type TerrainConfig = {
  baseSeed: number;
  prestigeSeedDelta: number;
  worldRadius: number;
  chunkSize?: number;
  surfaceBias: number;
  quantizeScale: number;
  waterLevel: number;
  bedrockY?: number;
  genRetries?: number;
};

export const defaultTerrainConfig: TerrainConfig = {
  baseSeed: 123,
  prestigeSeedDelta: 99,
  worldRadius: 30,
  chunkSize: 16,
  surfaceBias: 2.0,
  quantizeScale: 4,
  waterLevel: -12,
  bedrockY: -50,
  genRetries: 5,
};
