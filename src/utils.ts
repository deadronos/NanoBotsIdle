import { getVoxelValueFromHeight, noise2D } from "./sim/terrain-core";

export {
  chunkDistanceSq2,
  chunkDistanceSq3,
  forEachRadialChunk,
  generateRadialOffsets,
} from "./utils/chunkPriority";

export { getVoxelValueFromHeight as getVoxelValue, noise2D };

// Pseudo-random number generator
export const random = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
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

// Helper to get terrain height at a specific x, z coordinate
export const getTerrainHeight = (x: number, z: number): number => {
  // Quantize coordinates to grid
  const h = Math.floor(noise2D(x, z) * 2);
  // Flatten water level
  if (h < 0) return 0;
  return h;
};

// Continuous height for smoother physics/camera walking
export const getSmoothHeight = (x: number, z: number): number => {
  return noise2D(x, z) * 2;
};
