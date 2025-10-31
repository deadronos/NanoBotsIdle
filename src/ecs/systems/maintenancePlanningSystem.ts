import { World } from "../world/World";

/**
 * Maintenance Planning System
 * 
 * Creates maintenance requests for buildings that need repair.
 * Similar to demandPlanningSystem but for maintenance instead of hauling.
 */

// Buildings request maintenance when wear exceeds this threshold
const MAINTENANCE_THRESHOLD = 0.3; // 30% wear

// How long to wait between checks for the same building (seconds)
const MAINTENANCE_REQUEST_COOLDOWN = 30;

export function maintenancePlanningSystem(world: World, _dt: number) {
  const currentTime = world.globals.simTimeSeconds;

  // Clear old maintenance requests (older than 60 seconds)
  world.maintenanceRequests = world.maintenanceRequests.filter(
    (req) => currentTime - req.createdAt < 60
  );

  // Check all degradable buildings for maintenance needs
  Object.entries(world.degradable).forEach(([idStr, degradable]) => {
    const entityId = Number(idStr);

    // Skip if wear is below threshold
    if (degradable.wear < MAINTENANCE_THRESHOLD) {
      return;
    }

    // Check if there's already a maintenance request for this building
    const existingRequest = world.maintenanceRequests.find(
      (req) => req.targetEntity === entityId
    );

    // Skip if recently requested
    if (existingRequest && currentTime - existingRequest.createdAt < MAINTENANCE_REQUEST_COOLDOWN) {
      return;
    }

    // Check if a maintainer is already working on this building
    if (world.maintainerTargets[entityId]) {
      return;
    }

    // Calculate priority based on wear level and building importance
    let priorityScore = degradable.wear; // Base priority on wear (0.3-1.0)

    // Increase priority for critical buildings
    const entityType = world.entityType[entityId];
    if (entityType === "Fabricator" || entityType === "CoreCompiler") {
      priorityScore *= 2.0; // Critical buildings get 2x priority
    }

    // Higher priority if building is actually producing
    const producer = world.producer[entityId];
    if (producer && producer.active) {
      priorityScore *= 1.5; // Active buildings get 1.5x priority
    }

    // Create or update maintenance request
    if (existingRequest) {
      existingRequest.priorityScore = priorityScore;
      existingRequest.createdAt = currentTime;
    } else {
      world.maintenanceRequests.push({
        targetEntity: entityId,
        priorityScore,
        createdAt: currentTime,
      });
    }
  });

  // Sort maintenance requests by priority (highest first)
  world.maintenanceRequests.sort((a, b) => b.priorityScore - a.priorityScore);
}
