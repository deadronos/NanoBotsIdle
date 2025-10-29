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
  const cost = Math.floor(polyCost(droneIndex, 5, 0.6, 0.8, 1));
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
