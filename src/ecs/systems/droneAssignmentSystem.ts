import { World } from "../world/World";

export function droneAssignmentSystem(world: World, _dt: number) {
  // Find idle hauler drones and assign them tasks
  Object.entries(world.droneBrain).forEach(([idStr, brain]) => {
    const droneId = Number(idStr);

    // Handle hauler assignment
    if (brain.role === "hauler" && brain.state === "idle") {
      if (world.taskRequests.length === 0) return;

      // Pick first available task (already sorted by priority)
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
    }

    // Handle builder assignment with coordination
    if (brain.role === "builder" && brain.state === "idle") {
      // Check if avoidDuplicateGhostTargets is enabled for this drone
      const avoidDuplicates = brain.behavior?.avoidDuplicateGhostTargets || false;

      // Find ghost buildings that need construction
      // (This is a placeholder - actual ghost building system would be implemented elsewhere)
      // For now, we just ensure builders don't target the same entity if coordination is enabled
      
      // Look for ghost/incomplete buildings (entities without full components)
      let targetEntity: number | null = null;
      for (const [eIdStr] of Object.entries(world.position)) {
        const eId = Number(eIdStr);
        
        // Check if this entity is already being built by another drone
        if (avoidDuplicates && world.builderTargets[eId]) {
          continue; // Skip this target, already assigned
        }

        // Check if this is a buildable target (simplified logic)
        // In full implementation, would check for ghost buildings
        const hasProducer = world.producer[eId];
        const isInactive = hasProducer && !hasProducer.active;
        
        if (isInactive) {
          targetEntity = eId;
          break;
        }
      }

      if (targetEntity !== null) {
        brain.state = "building";
        brain.targetEntity = targetEntity;
        
        // Register this builder as working on this target
        if (avoidDuplicates) {
          world.builderTargets[targetEntity] = droneId;
        }
      }
    }

    // Clean up builder targets when builder finishes or becomes idle
    if (brain.role === "builder" && brain.state === "idle" && brain.targetEntity !== null) {
      // Remove this builder's target reservation
      if (world.builderTargets[brain.targetEntity] === droneId) {
        delete world.builderTargets[brain.targetEntity];
      }
      brain.targetEntity = null;
    }

    // Clean up maintainer targets when maintainer finishes or becomes idle
    // This must happen BEFORE assignment so we don't reassign immediately
    if (brain.role === "maintainer" && brain.state === "idle" && brain.targetEntity !== null) {
      // Remove this maintainer's target reservation
      if (world.maintainerTargets[brain.targetEntity] === droneId) {
        delete world.maintainerTargets[brain.targetEntity];
      }
      brain.targetEntity = null;
    }

    // Handle maintainer assignment
    if (brain.role === "maintainer" && brain.state === "idle") {
      if (world.maintenanceRequests.length === 0) return;

      // Pick first available maintenance request (already sorted by priority)
      const request = world.maintenanceRequests[0];

      // Check if another maintainer is already working on this building
      if (world.maintainerTargets[request.targetEntity]) {
        return; // Skip, already assigned
      }

      // Assign this maintainer to the maintenance task
      brain.state = "maintaining";
      brain.targetEntity = request.targetEntity;

      // Register this maintainer as working on this target
      world.maintainerTargets[request.targetEntity] = droneId;

      // Remove maintenance request from queue
      world.maintenanceRequests.shift();
    }
  });
}
