export const ECS_LIGHTING = {
  baseHue: 0.58,
  saturation: 0.52,
  lightnessBase: 0.22,
  lightnessScale: 0.5,
  ambientBase: 0.2,
  ambientScale: 0.5,
  sunBase: 0.15,
  sunScale: 0.9,
  sunOrbitRadius: 120,
  sunHeightBase: 30,
  sunHeightScale: 160,
};

export const ECS_MOB_SPAWN = {
  spawnInterval: 4,
  spawnAttempts: 6,
  maxMobs: 18,
  maxMobsPerChunk: 3,
  minDistance: 12,
  maxDistance: 48,
  lightThreshold: 7,
};

export const ECS_MOB_DEFAULTS = {
  wanderInterval: 2.5,
  speed: 1.2,
};

export const ECS_ITEM_DEFAULTS = {
  bobSpeed: 1.4,
};

export const ECS_PARTICLE_DEFAULTS = {
  velocity: { x: 0, y: 0.8, z: 0 },
  ttl: 1.2,
};
