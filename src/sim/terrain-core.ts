export const noise2D = (x: number, z: number, seed = 0): number => {
  const n =
    Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed) * 2 +
    Math.sin(x * 0.3 + seed * 2) * Math.cos(z * 0.3 - seed) * 1 +
    Math.sin(x * 0.05 - seed) * 2;
  return n;
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

export const getVoxelValueFromHeight = (y: number, waterLevel = -20): number => {
  if (y <= waterLevel) return 1;
  const heightAboveWater = y - waterLevel;
  if (heightAboveWater < 4) return 2;
  if (heightAboveWater < 7) return 5;
  if (heightAboveWater < 10) return 15;
  return 50;
};
