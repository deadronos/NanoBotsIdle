import { World } from "../world/World";

export function droneAssignmentSystem(world: World, _dt: number) {
  // Find idle hauler drones and assign them tasks
  Object.entries(world.droneBrain).forEach(([_idStr, brain]) => {
    if (brain.role !== "hauler" || brain.state !== "idle") return;
    if (world.taskRequests.length === 0) return;

    // Pick first available task (simplified)
    const task = world.taskRequests[0];

    // Check if there's a building with this resource
    let sourceEntity = null;
    for (const [eIdStr, inv] of Object.entries(world.inventory)) {
      const eId = Number(eIdStr);
      if (eId === task.requestEntity) continue;

      const have = inv.contents[task.resource] || 0;
      if (have > 0) {
        sourceEntity = eId;
        break;
      }
    }

    if (sourceEntity) {
      brain.state = "toPickup";
      brain.targetEntity = sourceEntity;
      brain.cargo.resource = task.resource;

      // Remove task from queue
      world.taskRequests.shift();
    }
  });
}
