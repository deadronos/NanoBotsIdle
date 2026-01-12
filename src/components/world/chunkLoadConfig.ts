import type { RenderConfig } from "../../config/render";

export type ChunkLoadConfig = RenderConfig["voxels"]["chunkLoad"];

const clampRadius = (value: number) => (value > 0 ? value : 1);

const normalizeDims = (value: number): 2 | 3 => (value === 2 ? 2 : 3);

export const normalizeChunkLoadConfig = (config: ChunkLoadConfig): ChunkLoadConfig => {
  return {
    initialRadius: clampRadius(config.initialRadius),
    initialDims: normalizeDims(config.initialDims),
    activeRadius: clampRadius(config.activeRadius),
    activeDims: normalizeDims(config.activeDims),
  };
};
