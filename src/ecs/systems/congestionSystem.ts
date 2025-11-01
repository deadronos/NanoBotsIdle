import type { System } from "./System";
import type { World } from "../world/World";

// Simple congestion system: count drones per grid cell and write a penalty map
export const congestionSystem: System = {
  id: "congestion",
  update: (world: World) => {
    const penalty: Record<string, number> = {};

    for (const [idStr, _brain] of Object.entries(world.droneBrain)) {
      const id = Number(idStr);
      const pos = world.position[id];
      if (!pos) continue;
      const key = `${pos.x},${pos.y}`;
      penalty[key] = (penalty[key] ?? 0) + 1;
    }

    // Convert counts into traversal penalty (e.g., count - 1 so single occupant is zero penalty)
    const traversalPenalty: Record<string, number> = {};
    for (const [k, count] of Object.entries(penalty)) {
      traversalPenalty[k] = Math.max(0, count - 1);
    }

    world.cellTraversalPenalty = traversalPenalty;
  },
};

export default congestionSystem;
