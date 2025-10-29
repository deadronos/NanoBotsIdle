import { World } from "../world/World";
import { UNLOCK_TRIGGERS } from "../../types/unlocks";

/**
 * UnlockSystem checks for unlock conditions and triggers new features
 * Called each game tick to progressively unlock gameplay elements
 */
export function unlockSystem(world: World, _deltaTime: number): void {
  // Count drones
  const droneCount = Object.values(world.droneBrain).length;

  // Count buildings (excluding Core and Drones)
  const buildingCount = Object.entries(world.entityType)
    .filter(([_, type]) => type !== "Core" && type !== "Drone")
    .length;

  // Calculate heat ratio
  const heatRatio = world.globals.heatSafeCap > 0 
    ? world.globals.heatCurrent / world.globals.heatSafeCap 
    : 0;

  // Check each unlock trigger
  for (const trigger of UNLOCK_TRIGGERS) {
    const unlockKey = trigger.unlockKey;
    
    // Skip if already unlocked
    if (world.globals.unlocks[unlockKey]) {
      continue;
    }

    // Check if conditions are met
    const shouldUnlock = trigger.check({
      droneCount,
      simTimeSeconds: world.globals.simTimeSeconds,
      heatRatio,
      buildingCount,
    });

    if (shouldUnlock) {
      // Trigger unlock
      world.globals.unlocks[unlockKey] = true;
      
      // Log notification (UI will pick this up)
      console.log(
        `[UNLOCK] ${trigger.notificationTitle}: ${trigger.notificationMessage}`
      );
      
      // Note: Actual notification UI will be handled by the UI layer
      // This system just updates the unlock state
    }
  }

  // Check progression milestones
  for (const milestone of world.globals.milestones) {
    if (!milestone.achieved && world.globals.simTimeSeconds >= milestone.timeSeconds) {
      milestone.achieved = true;
      console.log(`[MILESTONE] ${milestone.name}: ${milestone.description}`);
    }
  }
}
