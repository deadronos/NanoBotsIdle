import type { Producer } from "../ecs/components/Producer";
import type { WorldGlobals } from "../ecs/world/World";

const TIER_EXPONENT = 1.5;

export const computeHeatRatio = (globals: WorldGlobals): number => {
  if (globals.heatSafeCap <= 0) {
    return 0;
  }

  const ratio = globals.heatCurrent / globals.heatSafeCap;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 0;
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

  return producer.baseRate * tierModifier * heatModifier;
};
