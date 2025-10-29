// Run-behavior knobs modified by Fork modules (per-run only)
export interface RunBehaviorContext {
  // Hauler behavior
  prefetchCriticalInputs: boolean;
  lowWaterThresholdFraction: number | null;

  // Builder behavior
  buildRadiusBonus: number;
  avoidDuplicateGhostTargets: boolean;

  // Emergency cooling routing overrides
  heatCriticalRoutingBoost: boolean;
  heatCriticalThresholdRatio: number; // 0..1
  coolerPriorityOverride: number | null; // smaller = more urgent, 0 is highest

  // Recycling + recovery
  refundToFabricator: boolean;
  refundComponentsFraction: number; // 0..1
  postForkRebuildBoost: boolean;

  // Overclock surge targeting
  overrideTaskPrioritiesDuringOverclock: boolean;
  overclockPrimaryTargets: string[]; // e.g. ["Fabricator","CoreCompiler"]
  overclockNonPrimaryPenalty: number; // big number deprioritizes non-primaries
}

export const defaultRunBehaviorContext: RunBehaviorContext = {
  // Hauler
  prefetchCriticalInputs: false,
  lowWaterThresholdFraction: null,

  // Builder
  buildRadiusBonus: 0,
  avoidDuplicateGhostTargets: false,

  // Cooling
  heatCriticalRoutingBoost: false,
  heatCriticalThresholdRatio: 0.9,
  coolerPriorityOverride: null,

  // Recycling
  refundToFabricator: false,
  refundComponentsFraction: 0,
  postForkRebuildBoost: false,

  // Overclock surge
  overrideTaskPrioritiesDuringOverclock: false,
  overclockPrimaryTargets: [],
  overclockNonPrimaryPenalty: 0,
};
