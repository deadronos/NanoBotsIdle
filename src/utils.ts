import { Color } from "three";

import { getVoxelValueFromHeight, noise2D } from "./sim/terrain-core";

export { getVoxelValueFromHeight as getVoxelValue, noise2D };

// Pseudo-random number generator
export const random = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const getVoxelColor = (y: number): Color => {
  // Height-based coloring
  if (y < -1) return new Color("#1a4d8c"); // Deep Water
  if (y < 0.5) return new Color("#2d73bf"); // Water
  if (y < 1.5) return new Color("#e3dba3"); // Sand
  if (y < 4) return new Color("#59a848"); // Grass
  if (y < 7) return new Color("#3b7032"); // Dark Grass/Forest
  if (y < 10) return new Color("#6e6e6e"); // Rock
  return new Color("#ffffff"); // Snow
};

export const getVoxelType = (y: number): "water" | "solid" => {
  if (y < 0.5) return "water";
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
