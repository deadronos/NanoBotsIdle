import { RunBehaviorContext } from "./forkContext";

// Shape of forkModule records loaded from JSON
export interface ForkModuleRecord {
  id: string;
  name: string;
  desc: string;
  cost: { currency: "ForkPoints"; amount: number };
  requires?: { requiresModuleIds?: string[] };
  effects: any; // see merge below; we merge known sections by key
}

// Deep-ish merge only on known keys, keeping it explicit/safe
export function applyModuleEffects(
  ctx: RunBehaviorContext,
  effects: any
): RunBehaviorContext {
  const next = { ...ctx };

  // droneBehavior
  if (effects?.droneBehavior) {
    const db = effects.droneBehavior;
    if (typeof db.prefetchCriticalInputs === "boolean")
      next.prefetchCriticalInputs = db.prefetchCriticalInputs;

    if (typeof db.buildRadiusBonus === "number")
      next.buildRadiusBonus = (next.buildRadiusBonus ?? 0) + db.buildRadiusBonus;

    if (typeof db.avoidDuplicateGhostTargets === "boolean")
      next.avoidDuplicateGhostTargets = db.avoidDuplicateGhostTargets;

    if (typeof db.lowWaterThresholdFraction === "number")
      next.lowWaterThresholdFraction = db.lowWaterThresholdFraction;
  }

  // demandPlanningSystem
  if (effects?.demandPlanningSystem) {
    const dps = effects.demandPlanningSystem;
    if (dps.lowWaterMarkEnabled === true && next.lowWaterThresholdFraction == null) {
      next.lowWaterThresholdFraction = dps.lowWaterThresholdFraction ?? 0.3;
    }
    if (dps.heatCriticalRoutingBoost === true) {
      next.heatCriticalRoutingBoost = true;
      if (typeof dps.heatCriticalThresholdRatio === "number") {
        next.heatCriticalThresholdRatio = dps.heatCriticalThresholdRatio;
      }
      if (typeof dps.coolerPriorityOverride === "number") {
        next.coolerPriorityOverride = dps.coolerPriorityOverride;
      }
    }
  }

  // recycling
  if (effects?.recycling) {
    const r = effects.recycling;
    if (r.refundToFabricator === true) next.refundToFabricator = true;
    if (typeof r.refundComponentsFraction === "number")
      next.refundComponentsFraction = Math.max(
        next.refundComponentsFraction,
        r.refundComponentsFraction
      );
  }

  // swarmRegen
  if (effects?.swarmRegen?.postForkRebuildBoost === true) {
    next.postForkRebuildBoost = true;
  }

  // overclockBehavior
  if (effects?.overclockBehavior) {
    const ob = effects.overclockBehavior;
    if (ob.overrideTaskPrioritiesDuringOverclock === true)
      next.overrideTaskPrioritiesDuringOverclock = true;

    if (Array.isArray(ob.primaryTargets))
      next.overclockPrimaryTargets = ob.primaryTargets.slice();

    if (typeof ob.nonPrimaryPenalty === "number")
      next.overclockNonPrimaryPenalty = ob.nonPrimaryPenalty;
  }

  return next;
}

export function applyAllModules(
  base: RunBehaviorContext,
  modules: ForkModuleRecord[]
): RunBehaviorContext {
  return modules.reduce(
    (ctx, m) => applyModuleEffects(ctx, m.effects),
    { ...base }
  );
}
