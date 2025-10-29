import { create } from "zustand";
import { createMetaSlice, MetaSlice } from "./metaSlice";
import { createRunSlice, RunSlice } from "./runSlice";
import { saveGame, loadGame } from "./persistence";

export type GameState = RunSlice & MetaSlice & {
  saveGame: () => void;
  loadGame: () => void;
};

export const useGameStore = create<GameState>()((set, get, api) => ({
  ...createMetaSlice(set, get, api),
  ...createRunSlice(set, get, api),
  
  saveGame: () => {
    const state = get();
    saveGame(
      {
        compileShardsBanked: state.compileShardsBanked,
        totalPrestiges: state.totalPrestiges,
        swarmCognition: state.swarmCognition,
        bioStructure: state.bioStructure,
        compilerOptimization: state.compilerOptimization,
        spendShards: state.spendShards,
      },
      {
        world: state.world,
        projectedCompileShards: state.projectedCompileShards,
        forkPoints: state.forkPoints,
        currentPhase: state.currentPhase,
      }
    );
  },

  loadGame: () => {
    const saveData = loadGame();
    if (saveData) {
      set({
        ...saveData.meta,
        ...saveData.run,
      });
    }
  },
}));
