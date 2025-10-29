import { World } from "../world/World";
import { ResourceName } from "../../types/resources";

export function demandPlanningSystem(world: World, _dt: number) {
  // Clear old task requests
  world.taskRequests = [];

  // For each producer building, check if it needs inputs
  Object.entries(world.producer).forEach(([idStr, producer]) => {
    const id = Number(idStr);
    const inv = world.inventory[id];

    if (!inv || !producer.active) return;

    // Check each input requirement
    Object.entries(producer.recipe.inputs).forEach(([resource, needed]) => {
      const have = inv.contents[resource as keyof typeof inv.contents] || 0;

      // Create task request if starved or low
      if (have < (needed || 0) * 2) {
        world.taskRequests.push({
          requestEntity: id,
          resource: resource as ResourceName,
          amountNeeded: (needed || 0) * 5 - have,
          priorityScore: 1,
          createdAt: world.globals.simTimeSeconds,
        });
      }
    });
  });
}
