import { World } from "../world/World";
import { ResourceName } from "../../types/resources";

export function demandPlanningSystem(world: World, _dt: number) {
  // Clear old task requests
  world.taskRequests = [];

  // Check if any drone has prefetch enabled
  const prefetchEnabled = Object.values(world.droneBrain).some(
    (brain) => brain.behavior.prefetchCriticalInputs
  );

  // Determine low water mark threshold (30% if prefetch enabled, otherwise 200% of needed)
  const lowWaterThreshold = prefetchEnabled ? 0.3 : 2.0;

  // Heat-critical routing: check if heat is critical
  const heatRatio = world.globals.heatSafeCap > 0 
    ? world.globals.heatCurrent / world.globals.heatSafeCap 
    : 0;
  const heatCritical = heatRatio > 0.9;

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
        let priorityScore = 1;

        // Heat-critical routing: boost Cooler priority significantly
        if (heatCritical && buildingType === "Cooler") {
          priorityScore = 1000;
        }

        // Overclock priority surge: prioritize Fabricator and CoreCompiler
        if (overclockActive) {
          if (buildingType === "Fabricator" || buildingType === "CoreCompiler") {
            priorityScore = 100;
          } else {
            // Penalize other buildings during overclock
            priorityScore = 0.01;
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
