import type { GameState, UISnapshot } from "./types";

export const selectUISnapshot = (state: GameState): UISnapshot =>
  state.uiSnapshot;

export const selectProjectedShards = (state: GameState): number =>
  state.projectedCompileShards;

export const selectWorld = (state: GameState) => state.world;

export const selectMetaUpgrades = (state: GameState) => ({
  swarm: state.swarmCognition,
  bio: state.bioStructure,
  compiler: state.compilerOptimization,
});

export const selectOverclockStatus = (state: GameState) => ({
  overclockEnabled: state.world.globals.overclockEnabled,
  overclockArmed: state.overclockArmed,
});
