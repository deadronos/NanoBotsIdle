import type { Color } from "three";

import { BASE_SEED, PRESTIGE_SEED_DELTA , WORLD_RADIUS } from "../constants";
import { getVoxelColor, getVoxelValue,noise2D } from "../utils";

export type Voxel = {
  id?: number;
  x: number;
  y: number;
  z: number;
  color: Color;
  value: number;
  type: "water" | "solid";
};

export const getSeed = (prestigeLevel = 1): number => BASE_SEED + PRESTIGE_SEED_DELTA * prestigeLevel;

export const computeVoxel = (x: number, z: number, seed?: number): Voxel => {
  const s = seed ?? getSeed(1);
  const raw = noise2D(x, z, s);
  // Keep the legacy world bias/quantization for surface height
  const y = Math.floor((raw + 0.6) * 4);
  const value = getVoxelValue(y);
  const color = getVoxelColor(y);
  const type = y < 0.5 ? "water" : "solid";

  return { x, y, z, color, value, type };
};

export const getSurfaceHeight = (x: number, z: number, seed?: number): number => computeVoxel(x, z, seed).y;

export const getSmoothHeight = (x: number, z: number, seed?: number): number => noise2D(x, z, seed) * 2;


export const generateInstances = (seed: number, radius: number = WORLD_RADIUS) => {
  const out: Voxel[] = [];
  let idCounter = 0;
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      const v = computeVoxel(x, z, seed);
      out.push({ ...v, id: idCounter++ });
    }
  }
  return out;
};
