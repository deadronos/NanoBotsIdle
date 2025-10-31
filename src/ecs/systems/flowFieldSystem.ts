import { GridData } from "../world/World";
import { FlowField } from "../components/FlowField";

/**
 * Calculates a flow field for pathfinding using Dijkstra's algorithm.
 * Each cell gets a vector pointing toward the optimal next cell to reach the target.
 * 
 * @param grid The grid data with walkCost information
 * @param targetX Target X coordinate (rounded to integer)
 * @param targetY Target Y coordinate (rounded to integer)
 * @param congestionWeight Weight factor for congestion costs (0 = ignore congestion)
 * @returns FlowField with direction vectors for each cell
 */
export function calculateFlowField(
  grid: GridData,
  targetX: number,
  targetY: number,
  congestionWeight: number = 0
): FlowField {
  const tx = Math.round(targetX);
  const ty = Math.round(targetY);

  // Initialize cost map with infinity
  const costMap = new Array(grid.width * grid.height).fill(Infinity);
  const targetIdx = ty * grid.width + tx;
  costMap[targetIdx] = 0;

  // Priority queue for Dijkstra's algorithm
  type QueueItem = { idx: number; cost: number };
  const queue: QueueItem[] = [{ idx: targetIdx, cost: 0 }];

  // Calculate cost to reach each cell from the target
  // TODO: Replace array sort with binary heap for O(log n) priority queue operations
  while (queue.length > 0) {
    // Find minimum cost item
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    // Skip if we've already found a better path
    if (current.cost > costMap[current.idx]) continue;

    const cx = current.idx % grid.width;
    const cy = Math.floor(current.idx / grid.width);

    // Check all 4 neighbors (up, right, down, left)
    const neighbors = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const { dx, dy } of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;

      // Bounds check
      if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;

      const nidx = ny * grid.width + nx;

      // Calculate move cost
      const baseCost = grid.walkCost[nidx] || 1;
      const congestionCost = congestionWeight > 0 ? (baseCost - 1) * congestionWeight : 0;
      const moveCost = baseCost + congestionCost;
      const newCost = current.cost + moveCost;

      // Update if we found a better path
      if (newCost < costMap[nidx]) {
        costMap[nidx] = newCost;
        queue.push({ idx: nidx, cost: newCost });
      }
    }
  }

  // Generate flow vectors from cost gradient
  const vectors: { dx: number; dy: number }[] = [];

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const idx = y * grid.width + x;
      const currentCost = costMap[idx];

      // Find neighbor with minimum cost
      let minCost = currentCost;
      let bestDx = 0;
      let bestDy = 0;

      const neighbors = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];

      for (const { dx, dy } of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;

        const nidx = ny * grid.width + nx;
        const neighborCost = costMap[nidx];

        if (neighborCost < minCost) {
          minCost = neighborCost;
          bestDx = dx;
          bestDy = dy;
        }
      }

      // Store normalized direction vector
      if (bestDx !== 0 || bestDy !== 0) {
        const len = Math.sqrt(bestDx * bestDx + bestDy * bestDy);
        vectors.push({ dx: bestDx / len, dy: bestDy / len });
      } else {
        // No better neighbor (at target or unreachable)
        vectors.push({ dx: 0, dy: 0 });
      }
    }
  }

  return {
    targetX: tx,
    targetY: ty,
    vectors,
    lastUpdated: Date.now(),
    dirty: false,
  };
}

/**
 * Gets the flow direction at a specific position.
 * Interpolates between grid cells for smooth movement.
 */
export function getFlowDirection(
  flowField: FlowField,
  grid: GridData,
  x: number,
  y: number
): { dx: number; dy: number } {
  // Clamp to grid bounds
  const gx = Math.max(0, Math.min(grid.width - 1, Math.floor(x)));
  const gy = Math.max(0, Math.min(grid.height - 1, Math.floor(y)));

  const idx = gy * grid.width + gx;
  return flowField.vectors[idx] || { dx: 0, dy: 0 };
}
