import { World } from "../world/World";

const DRONE_SPEED = 2.0; // tiles per second

// Track maintenance work progress for drones currently maintaining
// NOTE: Module-level state is used here for simplicity. In a multi-world scenario,
// this should be moved to World state or a component-based tracking system.
// For the current single-world game design, this works correctly.
const maintenanceProgress: Record<number, number> = {};

export function movementSystem(world: World, dt: number) {
  Object.entries(world.droneBrain).forEach(([idStr, brain]) => {
    const id = Number(idStr);
    const pos = world.position[id];
    const path = world.path[id];

    // Handle maintainer drones performing work at target
    if (brain.role === "maintainer" && brain.state === "maintaining" && brain.targetEntity !== null) {
      const targetPos = world.position[brain.targetEntity];
      const degradable = world.degradable[brain.targetEntity];

      if (!targetPos || !degradable) {
        // Invalid target, go idle
        brain.state = "idle";
        brain.targetEntity = null;
        delete maintenanceProgress[id];
        return;
      }

      // Check if drone is at the target location
      const dx = targetPos.x - pos.x;
      const dy = targetPos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.5) {
        // Close enough to perform maintenance
        // Initialize progress if not exists
        if (maintenanceProgress[id] === undefined) {
          maintenanceProgress[id] = 0;
        }

        // Perform maintenance work
        maintenanceProgress[id] += dt;

        // Check if maintenance is complete
        if (maintenanceProgress[id] >= degradable.maintenanceTime) {
          // Maintenance complete - restore building condition
          degradable.wear = Math.max(0, degradable.wear - 0.6); // Reduce wear by 60%
          
          // Clean up
          brain.state = "idle";
          brain.targetEntity = null;
          delete maintenanceProgress[id];
        }
        
        return; // Don't move while performing maintenance
      }
      // If not at target, fall through to movement logic below
    }

    if (!pos || !path || path.idx >= path.nodes.length) return;

    const target = path.nodes[path.idx];
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      // Reached waypoint
      path.idx++;

      // Check if reached final destination
      if (path.idx >= path.nodes.length) {
        delete world.path[id];

        // Handle arrival
        if (brain.state === "toPickup") {
          // Pick up cargo
          const sourceInv = world.inventory[brain.targetEntity!];
          if (sourceInv && brain.cargo.resource) {
            const amount = Math.min(5, sourceInv.contents[brain.cargo.resource] || 0);
            sourceInv.contents[brain.cargo.resource] =
              (sourceInv.contents[brain.cargo.resource] || 0) - amount;
            brain.cargo.amount = amount;
            brain.state = "toDropoff";

            // Find destination for this resource
            for (const task of world.taskRequests) {
              if (task.resource === brain.cargo.resource) {
                brain.targetEntity = task.requestEntity;
                break;
              }
            }
          }
        } else if (brain.state === "toDropoff") {
          // Drop off cargo
          const destInv = world.inventory[brain.targetEntity!];
          if (destInv && brain.cargo.resource) {
            destInv.contents[brain.cargo.resource] =
              (destInv.contents[brain.cargo.resource] || 0) + brain.cargo.amount;
            brain.cargo.amount = 0;
            brain.cargo.resource = null;
            brain.state = "idle";
            brain.targetEntity = null;
          }
        }
      }
    } else {
      // Move towards target
      const moveAmount = DRONE_SPEED * dt;
      const ratio = Math.min(moveAmount / dist, 1);
      pos.x += dx * ratio;
      pos.y += dy * ratio;
    }
  });
}
