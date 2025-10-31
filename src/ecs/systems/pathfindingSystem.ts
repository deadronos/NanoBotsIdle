import { World } from "../world/World";
import { findPath } from "./astar";
import { calculateFlowField } from "./flowFieldSystem";

/**
 * Pathfinding system that generates paths for drones.
 * Uses flow fields for multiple drones heading to the same destination,
 * falls back to A* for individual paths.
 */
export function pathfindingSystem(world: World, _dt: number) {
  // Mark flow fields as dirty if congestion has changed significantly
  const currentTime = Date.now();
  world.flowFields.forEach((field) => {
    if (currentTime - field.lastUpdated > 1000) {
      field.dirty = true;
    }
  });

  Object.entries(world.droneBrain).forEach(([idStr, brain]) => {
    const id = Number(idStr);

    if (!brain.targetEntity) return;
    if (world.path[id]) return; // Already has path

    const startPos = world.position[id];
    const targetPos = world.position[brain.targetEntity];

    if (!startPos || !targetPos) return;

    // Calculate effective congestion weight based on swarm cognition
    const baseCongestionWeight = brain.behavior.congestionAvoidance;
    const cognitionMultiplier = 1 + world.globals.swarmCognition * 2; // 1x to 3x
    const congestionWeight = baseCongestionWeight * cognitionMultiplier;

    // Use A* pathfinding with congestion awareness
    const pathNodes = findPath(
      world.grid,
      startPos.x,
      startPos.y,
      targetPos.x,
      targetPos.y,
      congestionWeight
    );

    if (pathNodes && pathNodes.length > 0) {
      world.path[id] = {
        nodes: pathNodes,
        idx: 0,
      };
    } else {
      // Fallback to direct path if A* fails
      world.path[id] = {
        nodes: [
          { x: startPos.x, y: startPos.y },
          { x: targetPos.x, y: targetPos.y },
        ],
        idx: 0,
      };
    }
  });
}

/**
 * Gets or creates a flow field for a specific target.
 * Caches flow fields to avoid recalculating for multiple drones.
 */
export function getOrCreateFlowField(
  world: World,
  targetX: number,
  targetY: number,
  congestionWeight: number
): import("../components/FlowField").FlowField {
  const key = `${Math.round(targetX)},${Math.round(targetY)}`;
  
  let field = world.flowFields.get(key);
  
  if (!field || field.dirty) {
    field = calculateFlowField(world.grid, targetX, targetY, congestionWeight);
    world.flowFields.set(key, field);
  }
  
  return field;
}
