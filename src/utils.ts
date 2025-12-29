import { Color } from "three";

// Pseudo-random number generator
export const random = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Simple 2D noise function (a mix of sines) to avoid heavy dependencies
export const noise2D = (x: number, z: number, seed = 0): number => {
  const n =
    Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed) * 2 +
    Math.sin(x * 0.3 + seed * 2) * Math.cos(z * 0.3 - seed) * 1 +
    Math.sin(x * 0.05 - seed) * 2;
  return n; // Returns a value roughly between -5 and 5
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

export const getVoxelValue = (y: number): number => {
  // Returns credit value based on scarcity/height
  if (y < 0.5) return 1; // Water/Sand (Common)
  if (y < 4) return 2; // Grass
  if (y < 7) return 5; // Forest
  if (y < 10) return 15; // Rock/Ore
  return 50; // Rare Snow peaks
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
