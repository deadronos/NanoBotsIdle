import { World } from "../world/World";

/**
 * Degradation System
 * 
 * Buildings with Degradable component accumulate wear over time.
 * Wear accumulates faster when:
 * - Building is actively producing
 * - Factory heat is high
 * - Building is overclocked
 * 
 * Wear causes efficiency penalties to production rate.
 */
export function degradationSystem(world: World, dt: number) {
  const heatRatio = world.globals.heatSafeCap > 0 
    ? world.globals.heatCurrent / world.globals.heatSafeCap 
    : 0;
  
  // Heat multiplier increases wear rate at high temperatures
  // Normal: 1.0x, Critical (>80%): up to 2.0x
  const heatMultiplier = 1.0 + Math.max(0, (heatRatio - 0.8) * 5);

  Object.entries(world.degradable).forEach(([idStr, degradable]) => {
    const entityId = Number(idStr);
    const producer = world.producer[entityId];
    
    if (!producer) {
      return; // Only producers degrade
    }

    // Only accumulate wear if building is active
    if (!producer.active) {
      return;
    }

    // Calculate wear accumulation
    let wearAccumulation = degradable.wearRate * dt;

    // Apply heat multiplier
    wearAccumulation *= heatMultiplier;

    // If building is overclocked, double wear rate
    const overclockable = world.overclockable[entityId];
    if (overclockable && world.globals.overclockEnabled) {
      wearAccumulation *= 2.0;
    }

    // Accumulate wear (capped at 1.0)
    degradable.wear = Math.min(1.0, degradable.wear + wearAccumulation);
  });
}

/**
 * Get the efficiency multiplier for a building based on its wear level
 * Returns 1.0 (100%) for pristine, down to (1 - maxEfficiencyPenalty) for maximum wear
 */
export function getDegradationEfficiencyMultiplier(world: World, entityId: number): number {
  const degradable = world.degradable[entityId];
  
  if (!degradable) {
    return 1.0; // No degradation component = no penalty
  }

  // Linear efficiency loss: 1.0 at wear=0, (1-penalty) at wear=1
  const efficiencyLoss = degradable.wear * degradable.maxEfficiencyPenalty;
  return 1.0 - efficiencyLoss;
}
