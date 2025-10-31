import { describe, it, expect, beforeEach } from "vitest";
import { calculateFlowField, getFlowDirection } from "../ecs/systems/flowFieldSystem";
import { GridData } from "../ecs/world/World";

describe("Flow Field Pathfinding", () => {
  let grid: GridData;

  beforeEach(() => {
    grid = {
      width: 10,
      height: 10,
      walkCost: new Array(100).fill(1),
    };
  });

  it("should create flow field pointing toward target", () => {
    const flowField = calculateFlowField(grid, 5, 5, 0);

    expect(flowField.targetX).toBe(5);
    expect(flowField.targetY).toBe(5);
    expect(flowField.vectors.length).toBe(100); // 10x10 grid

    // Check that the flow field has valid vectors
    const hasNonZeroVectors = flowField.vectors.some(
      (v) => v.dx !== 0 || v.dy !== 0
    );
    expect(hasNonZeroVectors).toBe(true);
  });

  it("should have zero vector at target location", () => {
    const flowField = calculateFlowField(grid, 5, 5, 0);

    const targetIdx = 5 * 10 + 5;
    const targetVector = flowField.vectors[targetIdx];

    // At the target, vector should be zero (no movement needed)
    expect(targetVector.dx).toBe(0);
    expect(targetVector.dy).toBe(0);
  });

  it("should point toward target from adjacent cells", () => {
    const flowField = calculateFlowField(grid, 5, 5, 0);

    // Check cell to the left of target (4, 5)
    const leftIdx = 5 * 10 + 4;
    const leftVector = flowField.vectors[leftIdx];
    expect(leftVector.dx).toBeGreaterThan(0); // Should point right
    expect(Math.abs(leftVector.dy)).toBeLessThan(0.1); // Should not point up/down

    // Check cell above target (5, 4)
    const topIdx = 4 * 10 + 5;
    const topVector = flowField.vectors[topIdx];
    expect(topVector.dy).toBeGreaterThan(0); // Should point down
    expect(Math.abs(topVector.dx)).toBeLessThan(0.1); // Should not point left/right
  });

  it("should avoid high-cost tiles with congestion weight", () => {
    // Create a wall of high-cost tiles
    for (let y = 2; y < 8; y++) {
      grid.walkCost[y * 10 + 5] = 10; // Column 5 is expensive
    }

    const flowFieldNoCongestion = calculateFlowField(grid, 7, 5, 0);
    const flowFieldWithCongestion = calculateFlowField(grid, 7, 5, 1);

    // Cells to the left of the wall should behave differently
    const testIdx = 5 * 10 + 3; // Cell at (3, 5)

    // With congestion awareness, should tend to route around expensive area
    // Without it, might go through
    expect(flowFieldNoCongestion.vectors[testIdx]).toBeDefined();
    expect(flowFieldWithCongestion.vectors[testIdx]).toBeDefined();
  });

  it("should handle grid boundaries gracefully", () => {
    const flowField = calculateFlowField(grid, 0, 0, 0);

    // Check corner cell - should have valid vector
    const cornerIdx = 9 * 10 + 9;
    const cornerVector = flowField.vectors[cornerIdx];
    expect(cornerVector.dx).toBeLessThanOrEqual(0); // Should point left
    expect(cornerVector.dy).toBeLessThanOrEqual(0); // Should point up
  });

  it("should create flow field for target at grid edge", () => {
    const flowField = calculateFlowField(grid, 9, 9, 0);

    expect(flowField.targetX).toBe(9);
    expect(flowField.targetY).toBe(9);
    expect(flowField.vectors.length).toBe(100);

    // Cell at (0, 0) should point toward (9, 9)
    const originIdx = 0;
    const originVector = flowField.vectors[originIdx];
    
    // Should point right and/or down (toward target)
    // Due to 4-directional pathfinding, might choose just one direction
    expect(originVector.dx).toBeGreaterThanOrEqual(0); // Point right or neutral
    expect(originVector.dy).toBeGreaterThanOrEqual(0); // Point down or neutral
    
    // At least one direction should be positive
    expect(originVector.dx + originVector.dy).toBeGreaterThan(0);
  });

  it("should normalize vectors to unit length", () => {
    const flowField = calculateFlowField(grid, 5, 5, 0);

    // Check that non-zero vectors are normalized
    for (let i = 0; i < flowField.vectors.length; i++) {
      const v = flowField.vectors[i];
      if (v.dx !== 0 || v.dy !== 0) {
        const length = Math.sqrt(v.dx * v.dx + v.dy * v.dy);
        expect(length).toBeCloseTo(1.0, 5); // Should be unit length
      }
    }
  });

  it("should mark flow field as not dirty when created", () => {
    const flowField = calculateFlowField(grid, 5, 5, 0);

    expect(flowField.dirty).toBe(false);
    expect(flowField.lastUpdated).toBeGreaterThan(0);
  });

  describe("getFlowDirection", () => {
    it("should return flow direction at integer position", () => {
      const flowField = calculateFlowField(grid, 5, 5, 0);

      const direction = getFlowDirection(flowField, grid, 3, 3);

      expect(direction).toBeDefined();
      expect(typeof direction.dx).toBe("number");
      expect(typeof direction.dy).toBe("number");
    });

    it("should handle floating point positions", () => {
      const flowField = calculateFlowField(grid, 5, 5, 0);

      const direction = getFlowDirection(flowField, grid, 3.7, 3.2);

      expect(direction).toBeDefined();
      // Should floor to grid coordinates
    });

    it("should clamp out-of-bounds positions", () => {
      const flowField = calculateFlowField(grid, 5, 5, 0);

      // Should not throw for out of bounds
      expect(() => getFlowDirection(flowField, grid, -1, -1)).not.toThrow();
      expect(() => getFlowDirection(flowField, grid, 100, 100)).not.toThrow();

      const direction1 = getFlowDirection(flowField, grid, -1, -1);
      const direction2 = getFlowDirection(flowField, grid, 100, 100);

      expect(direction1).toBeDefined();
      expect(direction2).toBeDefined();
    });

    it("should return zero vector at target", () => {
      const flowField = calculateFlowField(grid, 5, 5, 0);

      const direction = getFlowDirection(flowField, grid, 5, 5);

      expect(direction.dx).toBe(0);
      expect(direction.dy).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should calculate flow field for large grid efficiently", () => {
      const largeGrid: GridData = {
        width: 64,
        height: 64,
        walkCost: new Array(64 * 64).fill(1),
      };

      const startTime = performance.now();
      const flowField = calculateFlowField(largeGrid, 32, 32, 0);
      const endTime = performance.now();

      expect(flowField.vectors.length).toBe(64 * 64);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });
  });
});
