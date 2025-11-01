import type { Producer } from "../ecs/components/Producer";
import type { WorldGlobals } from "../ecs/world/World";

const TIER_EXPONENT = 1.5;

const clampNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

export const computeHeatRatio = (globals: WorldGlobals): number => {
  if (!globals || globals.heatSafeCap <= 0) {
    return 0;
  }

  const ratio = globals.heatCurrent / globals.heatSafeCap;
  return clampNonNegative(ratio);
};

export const polyCost = (
  level: number,
  base: number,
  scaleA = 1,
  scaleB = 1,
  scaleC = 1,
): number => {
  const n = Math.max(0, Math.floor(level));
  const cost =
    base * (n * n * scaleA + n * scaleB + scaleC);

  return clampNonNegative(cost);
};

export const getProducerOutputPerSec = (
  producer: Producer,
  globals: WorldGlobals,
): number => {
  if (!producer.active) {
    return 0;
  }

  const heatRatio = computeHeatRatio(globals);
  const heatModifier = 1 / (1 + heatRatio);
  const tierModifier = Math.max(1, producer.tier) ** TIER_EXPONENT;

  const output = producer.baseRate * tierModifier * heatModifier;

  return clampNonNegative(output);
};

export interface HaulingRateParams {
  haulerCount: number;
  basePerDrone: number;
  optimalDensity: number;
}

export const getHaulingEffectiveRate = ({
  haulerCount,
  basePerDrone,
  optimalDensity,
}: HaulingRateParams): number => {
  const count = clampNonNegative(Math.floor(haulerCount));
  if (count <= 0) {
    return 0;
  }

  const perDrone = clampNonNegative(basePerDrone);
  const density = Math.max(1, clampNonNegative(optimalDensity));
  const ratio = count / density;
  const efficiency = 1 / (1 + ratio * ratio);

  return clampNonNegative(count * perDrone * efficiency);
};

export interface CompileShardEstimateParams {
  peakThroughput: number;
  cohesionScore: number;
  stressSecondsAccum: number;
  yieldMult: number;
}

const COMPILE_A = 1.5;
const COMPILE_B = 4;
const COMPILE_C = 0.9;

const safeLog2 = (value: number): number =>
  Math.log2(Math.max(1, value));

export const getCompileShardEstimate = ({
  peakThroughput,
  cohesionScore,
  stressSecondsAccum,
  yieldMult,
}: CompileShardEstimateParams): number => {
  const throughputTerm =
    COMPILE_A * Math.sqrt(clampNonNegative(peakThroughput));
  const cohesionTerm = COMPILE_B * safeLog2(clampNonNegative(cohesionScore) + 1);
  const stressTerm =
    COMPILE_C * Math.pow(clampNonNegative(stressSecondsAccum), 0.7);
  const multiplier = clampNonNegative(yieldMult) || 0;

  const raw = throughputTerm + cohesionTerm + stressTerm;
  return clampNonNegative(raw * Math.max(1, multiplier));
};
