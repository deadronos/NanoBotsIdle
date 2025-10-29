import { World } from "../world/World";

const CONGESTION_DECAY = 0.5; // How fast congestion decays per second
const CONGESTION_INCREASE = 0.2; // How much each drone adds to a tile
const BASE_WALK_COST = 1.0;

export function congestionSystem(world: World, dt: number) {
  const { grid } = world;

  // Decay all congestion costs back toward base
  for (let i = 0; i < grid.walkCost.length; i++) {
    if (grid.walkCost[i] > BASE_WALK_COST) {
      grid.walkCost[i] = Math.max(
        BASE_WALK_COST,
        grid.walkCost[i] - CONGESTION_DECAY * dt
      );
    }
  }

  // Add congestion based on drone positions
  Object.entries(world.droneBrain).forEach(([idStr]) => {
    const id = Number(idStr);
    const pos = world.position[id];

    if (!pos) return;

    // Round position to grid coordinates
    const gx = Math.round(pos.x);
    const gy = Math.round(pos.y);

    // Bounds check
    if (gx < 0 || gx >= grid.width || gy < 0 || gy >= grid.height) return;

    const idx = gy * grid.width + gx;
    grid.walkCost[idx] = Math.min(
      grid.walkCost[idx] + CONGESTION_INCREASE * dt,
      BASE_WALK_COST + 5.0 // Cap maximum congestion
    );
  });
}
