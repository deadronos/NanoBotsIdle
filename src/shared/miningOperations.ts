export const MINING_ZONE_RADIUS = 6;

export type MiningZone = { x: number; y: number; z: number };

export const inMiningZone = (zone: MiningZone, x: number, z: number) =>
  (x - zone.x) ** 2 + (z - zone.z) ** 2 <= MINING_ZONE_RADIUS ** 2;

export const LANDING_PROFILES = {
  near: {
    name: "Sheltered Basin",
    description: "Shorter automatic routes · standard ore value",
    seedOffset: 0,
    yieldMultiplier: 1,
  },
  rich: {
    name: "Outer Ridge",
    description: "Longer automatic routes · +25% ore value",
    seedOffset: 47,
    yieldMultiplier: 1.25,
  },
} as const;

export type LandingProfile = keyof typeof LANDING_PROFILES;

export const DOCK_CAPACITY = 4;

export const outpostRouteScore = (distance: number, docked: number, queued: number) =>
  distance + (docked + queued) * 10;
