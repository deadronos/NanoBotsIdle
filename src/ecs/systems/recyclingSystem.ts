import { World } from "../world/World";
import { EntityId } from "../world/EntityId";
import { ResourceName } from "../../types/resources";

/**
 * Recycle/scrap an entity and return resources to inventory
 * @param world Game world
 * @param entityId Entity to recycle
 * @returns Resources recovered, or null if recycling failed
 */
export function recycleEntity(
  world: World,
  entityId: EntityId
): Partial<Record<ResourceName, number>> | null {
  const recyclable = world.recyclable?.[entityId];
  if (!recyclable) {
    return null; // Entity is not recyclable
  }

  // Calculate refund amounts
  const refund: Partial<Record<ResourceName, number>> = {};
  for (const [resource, amount] of Object.entries(recyclable.buildCost)) {
    const refundAmount = Math.floor(amount * recyclable.refundFraction);
    if (refundAmount > 0) {
      refund[resource as ResourceName] = refundAmount;
    }
  }

  // Find target inventory (Fabricator or Core)
  let targetInventory: EntityId | null = null;

  if (recyclable.refundToFabricator) {
    // Find first Fabricator
    for (const [idStr, type] of Object.entries(world.entityType)) {
      if (type === "Fabricator") {
        targetInventory = Number(idStr);
        break;
      }
    }
  } else {
    // Find Core
    for (const [idStr, type] of Object.entries(world.entityType)) {
      if (type === "Core") {
        targetInventory = Number(idStr);
        break;
      }
    }
  }

  if (targetInventory === null) {
    return null; // No valid target for refund
  }

  const targetInv = world.inventory[targetInventory];
  if (!targetInv) {
    return null; // Target has no inventory
  }

  // Add resources to target inventory
  for (const [resource, amount] of Object.entries(refund)) {
    const resourceKey = resource as ResourceName;
    targetInv.contents[resourceKey] = (targetInv.contents[resourceKey] || 0) + amount;
  }

  // Remove the entity from the world
  // (In full implementation, would remove all components)
  delete world.position[entityId];
  delete world.inventory[entityId];
  delete world.producer[entityId];
  delete world.heatSource[entityId];
  delete world.powerLink[entityId];
  delete world.recyclable?.[entityId];
  delete world.entityType[entityId];

  return refund;
}

/**
 * System to handle recycling requests
 * Note: Actual recycling is triggered externally via recycleEntity function
 * This system is a placeholder for future automatic recycling logic
 */
export function recyclingSystem(_world: World, _dt: number) {
  // Future: Could implement automatic recycling of damaged/offline buildings
  // For now, recycling is manual via UI actions
  
  // Example: Auto-recycle buildings that have been offline for too long
  // const autoRecycleThreshold = 60; // seconds
  // for (const [idStr, powerLink] of Object.entries(world.powerLink)) {
  //   if (!powerLink.online && powerLink.offlineTime > autoRecycleThreshold) {
  //     recycleEntity(world, Number(idStr));
  //   }
  // }
}
