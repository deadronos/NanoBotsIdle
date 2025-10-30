export interface ForkModuleCost {
  currency: "ForkPoints";
  amount: number;
}

export interface ForkModuleRequirements {
  requiresModuleIds: string[];
}

export interface ForkModuleEffects {
  droneBehavior?: {
    prefetchCriticalInputs?: boolean;
    buildRadiusBonus?: number;
    avoidDuplicateGhostTargets?: boolean;
  };
  demandPlanningSystem?: {
    lowWaterMarkEnabled?: boolean;
    lowWaterThresholdFraction?: number;
    heatCriticalRoutingBoost?: boolean;
    heatCriticalThresholdRatio?: number;
    coolerPriorityOverride?: number | null;
  };
  recycling?: {
    refundToFabricator?: boolean;
    refundComponentsFraction?: number;
  };
  swarmRegen?: {
    postForkRebuildBoost?: boolean;
  };
  overclockBehavior?: {
    overrideTaskPrioritiesDuringOverclock?: boolean;
    primaryTargets?: string[];
    nonPrimaryPenalty?: number;
  };
}

export interface ForkModule {
  id: string;
  name: string;
  desc: string;
  cost: ForkModuleCost;
  requires: ForkModuleRequirements;
  effects: ForkModuleEffects;
}

export interface ForkModulesData {
  forkModules: ForkModule[];
}

export interface RunBehaviorContext {
  // hauler behavior
  prefetchCriticalInputs: boolean;
  lowWaterThresholdFraction: number | null;
  lowWaterMarkEnabled: boolean;

  // builder behavior
  buildRadiusBonus: number;
  avoidDuplicateGhostTargets: boolean;

  // emergency cooling
  heatCriticalRoutingBoost: boolean;
  heatCriticalThresholdRatio: number;
  coolerPriorityOverride: number | null;

  // recycling
  refundToFabricator: boolean;
  refundComponentsFraction: number;
  postForkRebuildBoost: boolean;

  // overclock surge
  overrideTaskPrioritiesDuringOverclock: boolean;
  overclockPrimaryTargets: string[];
  overclockNonPrimaryPenalty: number;
}

export const DEFAULT_RUN_BEHAVIOR_CONTEXT: RunBehaviorContext = {
  prefetchCriticalInputs: false,
  lowWaterThresholdFraction: null,
  lowWaterMarkEnabled: false,
  buildRadiusBonus: 0,
  avoidDuplicateGhostTargets: false,
  heatCriticalRoutingBoost: false,
  heatCriticalThresholdRatio: 0.9,
  coolerPriorityOverride: null,
  refundToFabricator: false,
  refundComponentsFraction: 0,
  postForkRebuildBoost: false,
  overrideTaskPrioritiesDuringOverclock: false,
  overclockPrimaryTargets: [],
  overclockNonPrimaryPenalty: 0,
};
