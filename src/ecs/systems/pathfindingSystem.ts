import { World } from "../world/World";
import { findPath } from "./astar";

export function pathfindingSystem(world: World, _dt: number) {
  Object.entries(world.droneBrain).forEach(([idStr, brain]) => {
    const id = Number(idStr);

    if (!brain.targetEntity) return;
    if (world.path[id]) return; // Already has path

    const startPos = world.position[id];
    const targetPos = world.position[brain.targetEntity];

    if (!startPos || !targetPos) return;

    // Use A* pathfinding with congestion awareness
    const congestionWeight = brain.behavior.congestionAvoidance;
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
