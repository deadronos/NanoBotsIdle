import { World } from "../world/World";
import { ResourceName } from "../../types/resources";

// Behavior configuration constants
const PREFETCH_LOW_WATER_THRESHOLD = 0.3; // 30% - trigger hauling when inventory falls below this ratio
const NORMAL_LOW_WATER_THRESHOLD = 2.0; // 200% - only trigger when starved (backwards compat)
const HEAT_CRITICAL_THRESHOLD = 0.9; // 90% - heat ratio at which emergency cooling activates
const HEAT_CRITICAL_PRIORITY_BOOST = 1000; // Priority multiplier for Coolers during heat crisis
const OVERCLOCK_CRITICAL_PRIORITY = 100; // Priority boost for Fabricator/CoreCompiler during overclock
const OVERCLOCK_NON_CRITICAL_PENALTY = 0.01; // Priority penalty for other buildings during overclock
const NORMAL_TASK_PRIORITY = 1; // Default priority for all tasks

export function demandPlanningSystem(world: World, _dt: number) {
  // Clear old task requests
  world.taskRequests = [];

  // Check if any drone has prefetch enabled
  const prefetchEnabled = Object.values(world.droneBrain).some(
    (brain) => brain.behavior.prefetchCriticalInputs
  );

  // Determine low water mark threshold
  const lowWaterThreshold = prefetchEnabled 
    ? PREFETCH_LOW_WATER_THRESHOLD 
    : NORMAL_LOW_WATER_THRESHOLD;

  // Heat-critical routing: check if heat is critical
  const heatRatio = world.globals.heatSafeCap > 0 
    ? world.globals.heatCurrent / world.globals.heatSafeCap 
    : 0;
  const heatCritical = heatRatio > HEAT_CRITICAL_THRESHOLD;

  // Overclock priority surge: check if overclocking
  const overclockActive = world.globals.overclockEnabled;

  // For each producer building, check if it needs inputs
  Object.entries(world.producer).forEach(([idStr, producer]) => {
    const id = Number(idStr);
    const inv = world.inventory[id];

    if (!inv || !producer.active) return;

    const buildingType = world.entityType[id];
    
    // Check each input requirement
    Object.entries(producer.recipe.inputs).forEach(([resource, needed]) => {
      const have = inv.contents[resource as keyof typeof inv.contents] || 0;
      const requiredAmount = needed || 0;

      // Calculate inventory ratio (current / max capacity based on production needs)
      const maxDesiredInventory = requiredAmount * 10; // Keep up to 10 cycles worth
      const inventoryRatio = maxDesiredInventory > 0 ? have / maxDesiredInventory : 0;

      // Create task request if below low water mark
      if (inventoryRatio < lowWaterThreshold) {
        let priorityScore = NORMAL_TASK_PRIORITY;

        // Heat-critical routing: boost Cooler priority significantly
        if (heatCritical && buildingType === "Cooler") {
          priorityScore = HEAT_CRITICAL_PRIORITY_BOOST;
        }

        // Overclock priority surge: prioritize Fabricator and CoreCompiler
        if (overclockActive) {
          if (buildingType === "Fabricator" || buildingType === "CoreCompiler") {
            priorityScore = OVERCLOCK_CRITICAL_PRIORITY;
          } else {
            // Penalize other buildings during overclock
            priorityScore = OVERCLOCK_NON_CRITICAL_PENALTY;
          }
        }

        world.taskRequests.push({
          requestEntity: id,
          resource: resource as ResourceName,
          amountNeeded: maxDesiredInventory - have,
          priorityScore,
          createdAt: world.globals.simTimeSeconds,
        });
      }
    });
  });

  // Sort task requests by priority (highest first)
  world.taskRequests.sort((a, b) => b.priorityScore - a.priorityScore);
}
