import type { Color } from "three";

import { getConfig } from "../config/index";
import { getVoxelColor, getVoxelValue, noise2D } from "../utils";

export type Voxel = {
  id?: number;
  x: number;
  y: number;
  z: number;
  color: Color;
  value: number;
  type: "water" | "solid";
};

export const getSeed = (prestigeLevel = 1): number => {
  const cfg = getConfig();
  return cfg.terrain.baseSeed + cfg.terrain.prestigeSeedDelta * prestigeLevel;
};

export const computeVoxel = (x: number, z: number, seed?: number): Voxel => {
  const s = seed ?? getSeed(1);
  const raw = noise2D(x, z, s);
  const cfg = getConfig();
  // Use configured bias and quantization scale
  const y = Math.floor((raw + cfg.terrain.surfaceBias) * cfg.terrain.quantizeScale);
  const value = getVoxelValue(y);
  const color = getVoxelColor(y);
  const type = y < 0.5 ? "water" : "solid";

  return { x, y, z, color, value, type };
};
export const getSurfaceHeight = (x: number, z: number, seed?: number): number =>
  computeVoxel(x, z, seed).y;

export const getSmoothHeight = (x: number, z: number, seed?: number): number =>
  noise2D(x, z, seed) * 2;

export const generateInstances = (seed: number, radius?: number) => {
  const cfg = getConfig();
  const r = typeof radius === "number" ? radius : cfg.terrain.worldRadius;
  const out: Voxel[] = [];
  let idCounter = 0;
  for (let x = -r; x <= r; x++) {
    for (let z = -r; z <= r; z++) {
      const v = computeVoxel(x, z, seed);
      out.push({ ...v, id: idCounter++ });
    }
  }
  return out;
};
