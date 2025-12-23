import type { WorldGenerationConfig } from "../voxel/World";

export const WORLD = {
  seed: 1337,
  viewDistanceChunks: 8,
  chunkSize: { x: 16, y: 72, z: 16 },
  seaLevel: 18,
};

export const WORLD_GENERATION_OVERRIDES: Partial<WorldGenerationConfig> | undefined = undefined;
