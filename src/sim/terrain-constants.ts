export const TERRAIN_COLORS = {
  DEEP_WATER: 0x405362,
  WATER: 0x798b7e,
  SAND: 0xdfc796,
  GRASS: 0x95b75f,
  DARK_GRASS: 0x67884b,
  ROCK: 0xa1978e,
  SNOW: 0xe3eef1,
};

// Thresholds relative to water level
export const TERRAIN_THRESHOLDS = {
  DEEP_WATER: -2,
  WATER: 0.5,
  SAND: 2.5,
  GRASS: 6,
  DARK_GRASS: 12,
  ROCK: 20,
};

/** Returns the sRGB hex color of the height band relative to the water level. */
export const getVoxelColor = (y: number, waterLevel = -12): number => {
  const height = y - waterLevel;
  if (height < TERRAIN_THRESHOLDS.DEEP_WATER) return TERRAIN_COLORS.DEEP_WATER;
  if (height < TERRAIN_THRESHOLDS.WATER) return TERRAIN_COLORS.WATER;
  if (height < TERRAIN_THRESHOLDS.SAND) return TERRAIN_COLORS.SAND;
  if (height < TERRAIN_THRESHOLDS.GRASS) return TERRAIN_COLORS.GRASS;
  if (height < TERRAIN_THRESHOLDS.DARK_GRASS) return TERRAIN_COLORS.DARK_GRASS;
  if (height < TERRAIN_THRESHOLDS.ROCK) return TERRAIN_COLORS.ROCK;
  return TERRAIN_COLORS.SNOW;
};
