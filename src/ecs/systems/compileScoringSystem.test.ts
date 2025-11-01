import { beforeEach, describe, expect, it } from "vitest";

import { allocateEntityId, createWorld } from "../world/createWorld";
import compileScoringSystem, {
  getCompileScoreDebugSnapshot,
  resetCompileScoreDebugSnapshot,
} from "./compileScoringSystem";
import { useGameStore } from "../../state/store";

const runSystem = (world: ReturnType<typeof createWorld>, dt = 1): void => {
  compileScoringSystem.update(world, dt);
};

beforeEach(() => {
  resetCompileScoreDebugSnapshot();
  useGameStore.setState((state) => ({
    projectedCompileShards: 0,
    compilerOptimization: {
      ...state.compilerOptimization,
      compileYieldMult: 1,
    },
  }));
});

describe("compileScoringSystem", () => {
  it("computes projected shards and updates debug snapshot", () => {
    const world = createWorld();
    world.globals.peakThroughput = 36;
    world.globals.throughputPerSec = 30;
    world.globals.cohesionScore = 5;
    world.globals.stressSecondsAccum = 10;
    world.globals.simTimeSeconds = 50;

    useGameStore.setState((state) => ({
      compilerOptimization: {
        ...state.compilerOptimization,
        compileYieldMult: 2,
      },
    }));

    runSystem(world, 1);

    const debug = getCompileScoreDebugSnapshot();
    expect(world.globals.projectedShards).toBeGreaterThan(0);
    expect(useGameStore.getState().projectedCompileShards).toBeCloseTo(
      world.globals.projectedShards,
    );
    expect(debug.projectedShards).toBeCloseTo(world.globals.projectedShards);
    expect(debug.yieldMultiplier).toBe(2);
    expect(debug.taskStats.total).toBe(0);
    expect(world.globals.cohesionScore).toBeGreaterThan(5);
  });

  it("accumulates stress seconds when overclock enabled", () => {
    const world = createWorld();
    world.globals.overclockEnabled = true;

    runSystem(world, 0.5);
    expect(world.globals.stressSecondsAccum).toBeCloseTo(0.5);
  });

  it("reduces cohesion gain when tasks are pending", () => {
    const world = createWorld();
    const sourceId = allocateEntityId(world);
    const destId = allocateEntityId(world);
    world.position[sourceId] = { x: 0, y: 0 };
    world.position[destId] = { x: 1, y: 1 };

    world.taskRequests.push(
      {
        id: "task-1",
        type: "haul",
        status: "pending",
        payload: {
          resource: "Carbon",
          amount: 3,
          remaining: 3,
          sourceId,
          destinationId: destId,
        },
      },
      {
        id: "task-2",
        type: "haul",
        status: "assigned",
        assignedTo: sourceId,
        payload: {
          resource: "Carbon",
          amount: 3,
          remaining: 1,
          sourceId,
          destinationId: destId,
        },
      },
    );

    runSystem(world, 1);

    // With half of tasks pending, cohesion gain should be below 1.
    expect(world.globals.cohesionScore).toBeGreaterThan(0);
    expect(world.globals.cohesionScore).toBeLessThan(1);

    const debug = getCompileScoreDebugSnapshot();
    expect(debug.taskStats.pending).toBe(1);
    expect(debug.taskStats.assigned).toBe(1);
  });
});
