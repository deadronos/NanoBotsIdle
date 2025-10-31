import { World } from "../world/World";

const CONGESTION_DECAY = 0.5; // How fast congestion decays per second
const CONGESTION_INCREASE = 0.2; // How much each drone adds to a tile
const BASE_WALK_COST = 1.0;
const LANE_REINFORCEMENT = 0.05; // How much path usage reduces cost (lane formation)
const LANE_DECAY = 0.1; // How fast lane benefits decay when not used
const MIN_LANE_COST = 0.8; // Minimum cost for well-established lanes

export function congestionSystem(world: World, dt: number) {
  const { grid } = world;

  // Decay all congestion costs back toward base
  for (let i = 0; i < grid.walkCost.length; i++) {
    if (grid.walkCost[i] > BASE_WALK_COST) {
      // Decay toward base
      grid.walkCost[i] = Math.max(
        BASE_WALK_COST,
        grid.walkCost[i] - CONGESTION_DECAY * dt
      );
    } else if (grid.walkCost[i] < BASE_WALK_COST) {
      // Decay lanes back toward base when not used
      grid.walkCost[i] = Math.min(
        BASE_WALK_COST,
        grid.walkCost[i] + LANE_DECAY * dt
      );
    }
  }

  // Add congestion based on drone positions
  Object.entries(world.droneBrain).forEach(([idStr]) => {
    const id = Number(idStr);
    const pos = world.position[id];
    const path = world.path[id];

    if (!pos) return;

    // Round position to grid coordinates
    const gx = Math.round(pos.x);
    const gy = Math.round(pos.y);

    // Bounds check
    if (gx < 0 || gx >= grid.width || gy < 0 || gy >= grid.height) return;

    const idx = gy * grid.width + gx;
    
    // Add immediate congestion
    grid.walkCost[idx] = Math.min(
      grid.walkCost[idx] + CONGESTION_INCREASE * dt,
      BASE_WALK_COST + 5.0 // Cap maximum congestion
    );

    // Lane emergence: reinforce paths that are actively being used
    // This creates emergent "highways" when many drones follow similar routes
    if (path && path.idx > 0 && path.idx < path.nodes.length) {
      const currentNode = path.nodes[path.idx];
      const nodeX = Math.round(currentNode.x);
      const nodeY = Math.round(currentNode.y);

      if (nodeX >= 0 && nodeX < grid.width && nodeY >= 0 && nodeY < grid.height) {
        const nodeIdx = nodeY * grid.width + nodeX;
        
        // Reduce cost on path nodes (lane formation)
        // This only applies when swarm cognition is active
        const laneStrength = world.globals.swarmCognition;
        if (laneStrength > 0) {
          grid.walkCost[nodeIdx] = Math.max(
            MIN_LANE_COST,
            grid.walkCost[nodeIdx] - LANE_REINFORCEMENT * laneStrength * dt
          );
        }
      }
    }
  });

  // Mark flow fields as dirty when congestion changes significantly
  if (world.flowFields && world.flowFields.size > 0) {
    const shouldUpdate = Math.random() < 0.1; // Update 10% of frames
    if (shouldUpdate) {
      world.flowFields.forEach((field) => {
        field.dirty = true;
      });
    }
  }
}
