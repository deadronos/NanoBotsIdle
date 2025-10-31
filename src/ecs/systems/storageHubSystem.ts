import { World } from "../world/World";

/**
 * StorageHub System
 * 
 * Applies capacity bonuses from Storage buildings to nearby buildings.
 * This reduces hauling overhead by allowing buildings to hold more inventory.
 */
export function storageHubSystem(world: World, _dt: number) {
  // For each building with inventory, calculate total capacity bonus from nearby Storage hubs
  // guard against missing world.inventory or world.storageHub
  const inventories = world.inventory || {};
  const storageHubs = world.storageHub || {};

  Object.entries(inventories).forEach(([idStr, inv]) => {
    const id = Number(idStr);
    const pos = world.position[id];
    if (!pos) return;

    // Skip drones - they have fixed capacity
    if (world.entityType[id] === "Drone") return;

    // Calculate base capacity (50 for most buildings, 999 for Core)
    const baseCapacity = world.entityType[id] === "Core" ? 999 : 50;
    
    // Sum up bonuses from all Storage hubs in range
    let totalBonus = 0;
    Object.entries(storageHubs).forEach(([hubIdStr, hub]) => {
      const hubId = Number(hubIdStr);
      const hubPos = world.position[hubId];
      if (!hubPos) return;

      // Calculate distance
      const dx = pos.x - hubPos.x;
      const dy = pos.y - hubPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply bonus if within range
      if (distance <= hub.radius) {
        totalBonus += hub.capacityBonus;
      }
    });

    // Update inventory capacity
    inv.capacity = baseCapacity + totalBonus;
  });
}
