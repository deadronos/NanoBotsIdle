import type { Position } from "../components/Position";
import type { GridData } from "../../types/entities";

const DIRECTIONS: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const keyOf = (position: Position): string => `${position.x},${position.y}`;

const isSamePosition = (a: Position, b: Position): boolean =>
  a.x === b.x && a.y === b.y;

const manhattanDistance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isWithinBounds = (grid: GridData, position: Position): boolean =>
  position.x >= 0 &&
  position.y >= 0 &&
  position.x < grid.width &&
  position.y < grid.height;

const getTraversalCost = (grid: GridData, position: Position): number => {
  const cost = grid.getTraversalCost?.(position.x, position.y) ?? 0;
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
};

const reconstructPath = (
  cameFrom: Map<string, string>,
  currentKey: string,
): Position[] => {
  const path: Position[] = [];
  let key = currentKey;

  while (cameFrom.has(key)) {
    const [x, y] = key.split(",").map(Number);
    path.push({ x, y });
    key = cameFrom.get(key) as string;
  }

  const [startX, startY] = key.split(",").map(Number);
  path.push({ x: startX, y: startY });

  return path.reverse();
};

export const findPath = (
  grid: GridData,
  start: Position,
  goal: Position,
): Position[] | null => {
  if (!isWithinBounds(grid, start) || !isWithinBounds(grid, goal)) {
    return null;
  }

  if (!grid.isWalkable(start.x, start.y) || !grid.isWalkable(goal.x, goal.y)) {
    return null;
  }

  if (isSamePosition(start, goal)) {
    return [{ ...start }];
  }

  const openSet = new Set<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  const startKey = keyOf(start);
  const goalKey = keyOf(goal);

  openSet.add(startKey);
  gScore.set(startKey, 0);
  fScore.set(startKey, manhattanDistance(start, goal));

  while (openSet.size > 0) {
    let currentKey: string | null = null;
    let lowestScore = Number.POSITIVE_INFINITY;

    for (const key of openSet) {
      const score = fScore.get(key) ?? Number.POSITIVE_INFINITY;
      if (score < lowestScore) {
        lowestScore = score;
        currentKey = key;
      }
    }

    if (!currentKey) {
      break;
    }

    if (currentKey === goalKey) {
      return reconstructPath(cameFrom, currentKey);
    }

    openSet.delete(currentKey);
    const [currentX, currentY] = currentKey.split(",").map(Number);
    const currentPosition = { x: currentX, y: currentY };
    const currentG = gScore.get(currentKey) ?? Number.POSITIVE_INFINITY;

    for (const direction of DIRECTIONS) {
      const neighbor: Position = {
        x: currentPosition.x + direction.x,
        y: currentPosition.y + direction.y,
      };

      if (
        !isWithinBounds(grid, neighbor) ||
        !grid.isWalkable(neighbor.x, neighbor.y)
      ) {
        continue;
      }

      const penalty = getTraversalCost(grid, neighbor);
      const tentativeG = currentG + 1 + penalty;
      const neighborKey = keyOf(neighbor);

      if (tentativeG >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentativeG);
      fScore.set(neighborKey, tentativeG + manhattanDistance(neighbor, goal));
      openSet.add(neighborKey);
    }
  }

  return null;
};
