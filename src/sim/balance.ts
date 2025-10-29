import { ResourceName } from "../types/resources";

// ==============================
// 1. UPGRADE / COST CURVES
// ==============================

// quadratic cost curve for building upgrades, drone production, etc.
export function polyCost(level: number, base: number, scaleA = 1, scaleB = 1, scaleC = 1): number {
  const n = level;
  return base * (n * n * scaleA + n * scaleB + scaleC);
}

export function getDroneFabricationCost(droneIndex: number): Partial<Record<ResourceName, number>> {
  // Quadratic cost scaling: cost(n) = base * (a*n² + b*n + c)
  // Tuned so that:
  // - Drone 1: ~9 Components (early game accessible)
  // - Drone 2: ~12 Components
  // - Drone 3: ~16 Components (requires some buildup)
  // - Drone 4-5: ~22-28 Components (15 min milestone)
  // This ensures 3-5 drones are achievable in first 15 minutes
  const base = 3;
  const a = 0.4; // Quadratic coefficient (reduced for gentler scaling)
  const b = 0.5; // Linear coefficient
  const c = 1.0; // Constant
  
  const cost = Math.floor(base * (a * droneIndex * droneIndex + b * droneIndex + c));
  return {
    Components: cost,
  };
}

export function getExtractorUpgradeCost(newTier: number): Partial<Record<ResourceName, number>> {
  const cost = Math.floor(polyCost(newTier, 20, 1.0, 1.0, 2));
  return {
    Components: cost,
    TissueMass: Math.floor(cost * 0.25),
  };
}

// ==============================
// 2. THROUGHPUT / PRODUCTION
// ==============================

export function getProducerOutputPerSec(params: {
  baseRate: number;
  tier: number;
  heatCurrent: number;
  heatSafeCap: number;
}): number {
  const { baseRate, tier, heatCurrent, heatSafeCap } = params;

  const heatRatio = heatSafeCap > 0 ? heatCurrent / heatSafeCap : 0;
  const tierMult = Math.pow(tier, 1.5);

  const outputPerSec = (baseRate * tierMult) / (1 + heatRatio);

  return Math.max(0, outputPerSec);
}

// ==============================
// 3. DRONE HAULING EFFICIENCY
// ==============================

export function getHaulingEffectiveRate(params: {
  haulerCount: number;
  basePerDrone: number;
  optimalDensity: number;
}): number {
  const { haulerCount, basePerDrone, optimalDensity } = params;

  if (haulerCount <= 0) return 0;
  const ratio = haulerCount / Math.max(1, optimalDensity);
  const efficiency = 1 / (1 + ratio * ratio);

  const totalRate = haulerCount * basePerDrone * efficiency;
  return totalRate;
}

// ==============================
// 4. COMPILE SHARD YIELD
// ==============================

export function getCompileShardEstimate(params: {
  peakThroughput: number;
  cohesionScore: number;
  stressSecondsAccum: number;
  yieldMult: number;
}): number {
  const { peakThroughput, cohesionScore, stressSecondsAccum, yieldMult } = params;

  const A = 1.5;
  const B = 4.0;
  const C = 0.9;

  const safeLog = (x: number) => Math.log2(Math.max(1, x));

  const termThroughput = A * Math.sqrt(Math.max(0, peakThroughput));
  const termCohesion = B * safeLog(cohesionScore + 1);
  const termStress = C * Math.pow(Math.max(0, stressSecondsAccum), 0.7);

  const raw = termThroughput + termCohesion + termStress;

  return raw * yieldMult;
}
