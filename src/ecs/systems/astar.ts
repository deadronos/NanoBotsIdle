import { GridData } from "../world/World";

interface Node {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost (g + h)
  parent: Node | null;
}

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  // Manhattan distance
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function getNeighbors(node: Node, grid: GridData): Array<{ x: number; y: number }> {
  const neighbors: Array<{ x: number; y: number }> = [];
  const dirs = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 }, // right
    { dx: 0, dy: 1 }, // down
    { dx: -1, dy: 0 }, // left
  ];

  for (const { dx, dy } of dirs) {
    const nx = node.x + dx;
    const ny = node.y + dy;

    if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

function getCost(grid: GridData, x: number, y: number): number {
  const idx = y * grid.width + x;
  return grid.walkCost[idx] || 1;
}

export function findPath(
  grid: GridData,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  congestionWeight: number = 0
): Array<{ x: number; y: number }> | null {
  // Round positions to integers
  const sx = Math.round(startX);
  const sy = Math.round(startY);
  const gx = Math.round(goalX);
  const gy = Math.round(goalY);

  // Early exit if start equals goal
  if (sx === gx && sy === gy) {
    return [{ x: sx, y: sy }];
  }

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: sx,
    y: sy,
    g: 0,
    h: heuristic(sx, sy, gx, gy),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  const nodeMap = new Map<string, Node>();
  nodeMap.set(`${sx},${sy}`, startNode);

  // Limit iterations to prevent infinite loops
  let iterations = 0;
  const maxIterations = grid.width * grid.height;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check if we reached the goal
    if (current.x === gx && current.y === gy) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    // Check neighbors
    const neighbors = getNeighbors(current, grid);
    for (const { x: nx, y: ny } of neighbors) {
      const key = `${nx},${ny}`;
      if (closedSet.has(key)) continue;

      const baseCost = getCost(grid, nx, ny);
      const congestionCost = congestionWeight > 0 ? baseCost * congestionWeight : 0;
      const moveCost = baseCost + congestionCost;
      const tentativeG = current.g + moveCost;

      let neighbor = nodeMap.get(key);
      if (!neighbor) {
        neighbor = {
          x: nx,
          y: ny,
          g: Infinity,
          h: heuristic(nx, ny, gx, gy),
          f: Infinity,
          parent: null,
        };
        nodeMap.set(key, neighbor);
      }

      if (tentativeG < neighbor.g) {
        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.f = neighbor.g + neighbor.h;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  // No path found, return null
  return null;
}
