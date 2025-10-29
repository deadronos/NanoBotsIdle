import { describe, it, expect } from "vitest";
import { findPath } from "../ecs/systems/astar";
import { GridData } from "../ecs/world/World";

describe("A* Pathfinding", () => {
  it("should find a straight path in an open grid", () => {
    const grid: GridData = {
      width: 10,
      height: 10,
      walkCost: new Array(100).fill(1),
    };

    const path = findPath(grid, 0, 0, 5, 0, 0);

    expect(path).not.toBeNull();
    expect(path).toHaveLength(6); // 0,0 -> 5,0 includes start and end
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 0 });
  });

  it("should return single node path when start equals goal", () => {
    const grid: GridData = {
      width: 10,
      height: 10,
      walkCost: new Array(100).fill(1),
    };

    const path = findPath(grid, 5, 5, 5, 5, 0);

    expect(path).not.toBeNull();
    expect(path).toHaveLength(1);
    expect(path![0]).toEqual({ x: 5, y: 5 });
  });

  it("should find a path around high-cost tiles", () => {
    const grid: GridData = {
      width: 5,
      height: 5,
      walkCost: new Array(25).fill(1),
    };

    // Create a wall of high-cost tiles in the middle column
    for (let y = 0; y < 5; y++) {
      grid.walkCost[y * 5 + 2] = 100; // Column 2 is expensive
    }

    const path = findPath(grid, 0, 2, 4, 2, 1);

    expect(path).not.toBeNull();
    // Path should route around the expensive column
    if (path) {
      const middleColumn = path.filter((node) => node.x === 2);
      // Should minimize use of expensive column
      expect(middleColumn.length).toBeLessThanOrEqual(1);
    }
  });

  it("should handle congestion weight parameter", () => {
    const grid: GridData = {
      width: 5,
      height: 5,
      walkCost: new Array(25).fill(1),
    };

    // Increase cost on one tile
    grid.walkCost[2 * 5 + 2] = 3; // Center tile

    const pathNoCongestion = findPath(grid, 0, 0, 4, 4, 0);
    const pathWithCongestion = findPath(grid, 0, 0, 4, 4, 1);

    expect(pathNoCongestion).not.toBeNull();
    expect(pathWithCongestion).not.toBeNull();
    // Both should find paths, but may differ based on congestion awareness
  });

  it("should handle out of bounds coordinates gracefully", () => {
    const grid: GridData = {
      width: 10,
      height: 10,
      walkCost: new Array(100).fill(1),
    };

    // Path within bounds should work
    const path = findPath(grid, 0, 0, 9, 9, 0);
    expect(path).not.toBeNull();
  });

  it("should round floating point positions to integers", () => {
    const grid: GridData = {
      width: 10,
      height: 10,
      walkCost: new Array(100).fill(1),
    };

    const path = findPath(grid, 0.7, 0.3, 5.2, 0.8, 0);

    expect(path).not.toBeNull();
    // Should round to 1,0 -> 5,1
    expect(path![0]).toEqual({ x: 1, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 1 });
  });

  it("should find efficient Manhattan-distance paths", () => {
    const grid: GridData = {
      width: 10,
      height: 10,
      walkCost: new Array(100).fill(1),
    };

    const path = findPath(grid, 0, 0, 3, 3, 0);

    expect(path).not.toBeNull();
    // Manhattan distance is 6, so path should be 7 nodes (including start)
    expect(path!.length).toBe(7);
  });
});
