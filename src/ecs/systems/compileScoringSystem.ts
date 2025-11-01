import { getCompileShardEstimate } from "../../sim/balance";
import { useGameStore } from "../../state/store";
import type { System } from "./System";
import type { World } from "../world/World";

const clampFinite = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;

const sanitizeDelta = (dt: number): number =>
  Number.isFinite(dt) && dt > 0 ? dt : 0;

const updateCohesionScore = (
  world: World,
  dt: number,
  pendingTasks: number,
): void => {
  if (dt <= 0) {
    return;
  }

  const totalTasks = world.taskRequests.length;
  const penaltyRatio =
    totalTasks === 0 ? 0 : Math.min(1, pendingTasks / totalTasks);
  const gain = dt * (1 - penaltyRatio);

  world.globals.cohesionScore = Math.max(
    0,
    clampFinite(world.globals.cohesionScore + gain),
  );
};

const updateStressSeconds = (world: World, dt: number): void => {
  if (dt <= 0 || !world.globals.overclockEnabled) {
    return;
  }

  world.globals.stressSecondsAccum = Math.max(
    0,
    clampFinite(world.globals.stressSecondsAccum + dt),
  );
};

export interface CompileScoreDebugSnapshot {
  simTimeSeconds: number;
  peakThroughput: number;
  throughputPerSec: number;
  cohesionScore: number;
  stressSecondsAccum: number;
  projectedShards: number;
  yieldMultiplier: number;
  taskStats: {
    pending: number;
    assigned: number;
    total: number;
  };
}

const createEmptyDebugSnapshot = (): CompileScoreDebugSnapshot => ({
  simTimeSeconds: 0,
  peakThroughput: 0,
  throughputPerSec: 0,
  cohesionScore: 0,
  stressSecondsAccum: 0,
  projectedShards: 0,
  yieldMultiplier: 1,
  taskStats: {
    pending: 0,
    assigned: 0,
    total: 0,
  },
});

let latestDebugSnapshot: CompileScoreDebugSnapshot = createEmptyDebugSnapshot();

export const getCompileScoreDebugSnapshot = (): CompileScoreDebugSnapshot => ({
  ...latestDebugSnapshot,
});

export const resetCompileScoreDebugSnapshot = (): void => {
  latestDebugSnapshot = createEmptyDebugSnapshot();
};

export const compileScoringSystem: System = {
  id: "compileScoring",
  update: (world, dt) => {
    const delta = sanitizeDelta(dt);
    const pendingTasks = world.taskRequests.filter(
      (task) => task.status === "pending",
    ).length;
    const assignedTasks = world.taskRequests.filter(
      (task) => task.status === "assigned",
    ).length;

    updateCohesionScore(world, delta, pendingTasks);
    updateStressSeconds(world, delta);

    world.globals.peakThroughput = Math.max(
      world.globals.peakThroughput,
      clampFinite(world.globals.throughputPerSec),
    );

    const state = useGameStore.getState();
    const rawYieldMultiplier = clampFinite(
      state.compilerOptimization.compileYieldMult,
      1,
    );
    const yieldMultiplier = rawYieldMultiplier > 0 ? rawYieldMultiplier : 1;

    const projectedShards = getCompileShardEstimate({
      peakThroughput: world.globals.peakThroughput,
      cohesionScore: world.globals.cohesionScore,
      stressSecondsAccum: world.globals.stressSecondsAccum,
      yieldMult: yieldMultiplier,
    });

    world.globals.projectedShards = projectedShards;
    state.setProjectedShards(projectedShards);

    latestDebugSnapshot = {
      simTimeSeconds: clampFinite(world.globals.simTimeSeconds),
      peakThroughput: clampFinite(world.globals.peakThroughput),
      throughputPerSec: clampFinite(world.globals.throughputPerSec),
      cohesionScore: clampFinite(world.globals.cohesionScore),
      stressSecondsAccum: clampFinite(world.globals.stressSecondsAccum),
      projectedShards: clampFinite(projectedShards),
      yieldMultiplier,
      taskStats: {
        pending: pendingTasks,
        assigned: assignedTasks,
        total: world.taskRequests.length,
      },
    };
  },
};

export default compileScoringSystem;
