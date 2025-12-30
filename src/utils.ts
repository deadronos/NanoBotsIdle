import { Color } from "three";

import { getVoxelValueFromHeight, noise2D } from "./sim/terrain-core";

export { getVoxelValueFromHeight as getVoxelValue, noise2D };

// Pseudo-random number generator
export const random = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const getVoxelColor = (y: number, waterLevel = -20): Color => {
  // Height-based coloring relative to water level
  if (y < waterLevel - 2) return new Color("#1a4d8c"); // Deep Water
  if (y < waterLevel + 0.5) return new Color("#2d73bf"); // Water
  if (y < waterLevel + 2.5) return new Color("#e3dba3"); // Sand
  if (y < waterLevel + 6) return new Color("#59a848"); // Grass
  if (y < waterLevel + 12) return new Color("#3b7032"); // Dark Grass/Forest
  if (y < waterLevel + 20) return new Color("#6e6e6e"); // Rock
  return new Color("#ffffff"); // Snow
};

export const getVoxelType = (y: number, waterLevel = -20): "water" | "solid" => {
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

// Generate offsets within a cube/cross of radius sorted by squared distance ascending.
// dims = 3 (default) includes x,y,z; dims = 2 uses only x,z (y=0) for horizontal scans.
export const generateRadialOffsets = (radius: number, dims = 3): Array<{ dx: number; dy: number; dz: number }> => {
  const offsets: Array<{ dx: number; dy: number; dz: number }> = [];
  const min = -radius;
  const max = radius;

  for (let dx = min; dx <= max; dx++) {
    for (let dz = min; dz <= max; dz++) {
      if (dims === 2) {
        offsets.push({ dx, dy: 0, dz });
      } else {
        for (let dy = min; dy <= max; dy++) {
          offsets.push({ dx, dy, dz });
        }
      }
    }
  }

  offsets.sort((a, b) => {
    const da = a.dx * a.dx + a.dy * a.dy + a.dz * a.dz;
    const db = b.dx * b.dx + b.dy * b.dy + b.dz * b.dz;
    if (da !== db) return da - db;
    // tie-break deterministically: by dx, then dy, then dz
    if (a.dx !== b.dx) return a.dx - b.dx;
    if (a.dy !== b.dy) return a.dy - b.dy;
    return a.dz - b.dz;
  });

  return offsets;
};
