import { describe, expect, it } from "vitest";
import { findPath } from "./astar";
import type { GridData } from "../../types/entities";

const keyOf = (x: number, y: number): string => `${x},${y}`;

const createGrid = (
  width: number,
  height: number,
  blocked: Array<[number, number]> = [],
  costs: Array<[number, number, number]> = [],
): GridData => {
  const blockedSet = new Set(blocked.map(([x, y]) => keyOf(x, y)));
  const costMap = new Map<string, number>(
    costs.map(([x, y, cost]) => [keyOf(x, y), cost]),
  );

  return {
    width,
    height,
    isWalkable: (x, y) => !blockedSet.has(keyOf(x, y)),
    getTraversalCost: (x, y) => costMap.get(keyOf(x, y)) ?? 0,
  };
};

describe("findPath", () => {
  it("finds a straight path when unobstructed", () => {
    const grid = createGrid(3, 1);
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("navigates around blocked tiles", () => {
    const grid = createGrid(
      3,
      3,
      [
        [1, 1],
        [1, 0],
      ],
    );

    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });

    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual({ x: 0, y: 0 });
    expect(path?.[path.length - 1]).toEqual({ x: 2, y: 0 });
    expect(path?.some((node) => node.x === 1 && node.y === 0)).toBe(false);
    expect(path?.some((node) => node.x === 1 && node.y === 1)).toBe(false);
    expect(path && path.length).toBeGreaterThan(3);
  });

  it("prefers lower congestion cost paths", () => {
    const grid = createGrid(
      3,
      3,
      [],
      [
        [1, 1, 10],
      ],
    );

    const path = findPath(grid, { x: 0, y: 1 }, { x: 2, y: 1 });

    expect(path).not.toBeNull();
    const includesHighCostTile = path?.some(
      (node) => node.x === 1 && node.y === 1,
    );
    expect(includesHighCostTile).toBe(false);
  });
});
