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

// Get upgrade cost for any producer building tier upgrade
export function getBuildingUpgradeCost(newTier: number, buildingType: string): Partial<Record<ResourceName, number>> {
  let baseCost = 20;
  let scaleA = 1.0;
  let scaleB = 1.0;
  let scaleC = 2;

  // Different buildings have different upgrade costs
  switch (buildingType) {
    case "Extractor":
      baseCost = 20;
      break;
    case "Assembler":
      baseCost = 30;
      scaleA = 1.2;
      break;
    case "Fabricator":
      baseCost = 40;
      scaleA = 1.3;
      break;
    case "CoreCompiler":
      baseCost = 50;
      scaleA = 1.5;
      scaleB = 2.0;
      break;
    default:
      baseCost = 25;
  }

  const cost = Math.floor(polyCost(newTier, baseCost, scaleA, scaleB, scaleC));
  return {
    Components: cost,
    TissueMass: Math.floor(cost * 0.3),
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

// Shard formula coefficients
export const SHARD_THROUGHPUT_COEFF = 1.5;
export const SHARD_COHESION_COEFF = 4.0;
export const SHARD_STRESS_COEFF = 0.9;

export interface CompileShardBreakdown {
  throughputContribution: number;
  cohesionContribution: number;
  stressContribution: number;
  baseTotal: number;
  yieldMult: number;
  finalTotal: number;
}

export function getCompileShardBreakdown(params: {
  peakThroughput: number;
  cohesionScore: number;
  stressSecondsAccum: number;
  yieldMult: number;
}): CompileShardBreakdown {
  const { peakThroughput, cohesionScore, stressSecondsAccum, yieldMult } = params;

  const safeLog = (x: number) => Math.log2(Math.max(1, x));

  const throughputContribution = SHARD_THROUGHPUT_COEFF * Math.sqrt(Math.max(0, peakThroughput));
  const cohesionContribution = SHARD_COHESION_COEFF * safeLog(cohesionScore + 1);
  const stressContribution = SHARD_STRESS_COEFF * Math.pow(Math.max(0, stressSecondsAccum), 0.7);

  const baseTotal = throughputContribution + cohesionContribution + stressContribution;
  const finalTotal = baseTotal * yieldMult;

  return {
    throughputContribution,
    cohesionContribution,
    stressContribution,
    baseTotal,
    yieldMult,
    finalTotal,
  };
}

export function getCompileShardEstimate(params: {
  peakThroughput: number;
  cohesionScore: number;
  stressSecondsAccum: number;
  yieldMult: number;
}): number {
  const breakdown = getCompileShardBreakdown(params);
  return breakdown.finalTotal;
}
