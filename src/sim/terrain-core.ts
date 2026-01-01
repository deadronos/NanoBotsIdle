import { getConfig } from "../config/index";
import { createNoiseProvider } from "./noise";

// Cached provider per seed+type so we don't create instances per sample
const providerCache = new Map<string, { noise2D: (x: number, z: number) => number }>();

export const noise2D = (x: number, z: number, seed = 0): number => {
  const cfg = getConfig();
  const type = cfg.terrain.noiseType ?? "sincos";
  const key = `${seed}:${type}`;
  let provider = providerCache.get(key);
  if (!provider) {
    provider = createNoiseProvider(seed, type);
    providerCache.set(key, provider);
  }
  return provider.noise2D(x, z);
};

export const getSurfaceHeightCore = (
  x: number,
  z: number,
  seed: number,
  surfaceBias: number,
  quantizeScale: number,
): number => {
  const raw = noise2D(x, z, seed);
  return Math.floor((raw + surfaceBias) * quantizeScale);
};

export const getVoxelValueFromHeight = (y: number, waterLevel = -12): number => {
  if (y <= waterLevel) return 1;
  const heightAboveWater = y - waterLevel;
  if (heightAboveWater < 4) return 2;
  if (heightAboveWater < 7) return 5;
  if (heightAboveWater < 10) return 15;
  return 50;
};

/**
 * Returns height-based color as a hex number (no Color allocation).
 * To be used with Color.setHex() or similar methods.
 */
export const getVoxelColor = (y: number, waterLevel = -12): number => {
  // Height-based coloring relative to water level
  if (y < waterLevel - 2) return 0x1a4d8c; // Deep Water
  if (y < waterLevel + 0.5) return 0x2d73bf; // Water
  if (y < waterLevel + 2.5) return 0xe3dba3; // Sand
  if (y < waterLevel + 6) return 0x59a848; // Grass
  if (y < waterLevel + 12) return 0x3b7032; // Dark Grass/Forest
  if (y < waterLevel + 20) return 0x6e6e6e; // Rock
  return 0xffffff; // Snow
};

export const getVoxelType = (y: number, waterLevel = -12): "water" | "solid" => {
  if (y <= waterLevel) return "water";
  return "solid";
};
