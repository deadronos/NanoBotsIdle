import { World } from "../world/World";

const DRONE_SPEED = 2.0; // tiles per second

export function movementSystem(world: World, dt: number) {
  Object.entries(world.droneBrain).forEach(([idStr, brain]) => {
    const id = Number(idStr);
    const pos = world.position[id];
    const path = world.path[id];

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
