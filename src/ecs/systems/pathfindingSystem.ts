import { World } from "../world/World";

export function pathfindingSystem(world: World, _dt: number) {
  // Simplified: drones just path directly to targets
  Object.entries(world.droneBrain).forEach(([idStr, brain]) => {
    const id = Number(idStr);
    
    if (!brain.targetEntity) return;
    if (world.path[id]) return; // Already has path

    const startPos = world.position[id];
    const targetPos = world.position[brain.targetEntity];

    if (!startPos || !targetPos) return;

    // Simple direct path
    world.path[id] = {
      nodes: [
        { x: startPos.x, y: startPos.y },
        { x: targetPos.x, y: targetPos.y },
      ],
      idx: 0,
    };
  });
}
