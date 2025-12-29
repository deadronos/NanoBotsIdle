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

export const getVoxelValueFromHeight = (y: number): number => {
  if (y < 0.5) return 1;
  if (y < 4) return 2;
  if (y < 7) return 5;
  if (y < 10) return 15;
  return 50;
};
