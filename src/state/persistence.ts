import type { GameState } from "./types";
import {
  CURRENT_SCHEMA_VERSION,
  migrateSaveBlob,
  type GameSaveBlob,
} from "./migrations";

const clone = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export const createSaveBlob = (state: GameState): GameSaveBlob => ({
  version: CURRENT_SCHEMA_VERSION,
  meta: {
    compileShardsBanked: state.compileShardsBanked,
    totalPrestiges: state.totalPrestiges,
    swarmCognition: clone(state.swarmCognition),
    bioStructure: clone(state.bioStructure),
    compilerOptimization: clone(state.compilerOptimization),
  },
  run: {
    forkPoints: state.forkPoints,
    projectedCompileShards: state.projectedCompileShards,
    currentPhase: state.currentPhase,
    globals: clone(state.world.globals),
    world: clone(state.world),
    snapshot: clone(state.uiSnapshot),
  },
});

export const serializeGameState = (state: GameState): string =>
  JSON.stringify(createSaveBlob(state));

export const deserializeGameState = (
  payload: string | GameSaveBlob,
): GameSaveBlob => {
  const blob =
    typeof payload === "string"
      ? (JSON.parse(payload) as GameSaveBlob)
      : payload;

  return migrateSaveBlob(blob);
};
