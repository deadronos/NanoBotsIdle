import { create } from "zustand";
import { createMetaSlice, MetaSlice } from "./metaSlice";
import { createRunSlice, RunSlice } from "./runSlice";
import { saveGame, loadGame } from "./persistence";

export type GameState = RunSlice &
  MetaSlice & {
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
        purchasedUpgrades: state.purchasedUpgrades,
        swarmCognition: state.swarmCognition,
        bioStructure: state.bioStructure,
        compilerOptimization: state.compilerOptimization,
        spendShards: state.spendShards,
        getAvailableUpgrades: state.getAvailableUpgrades,
        canPurchaseUpgrade: state.canPurchaseUpgrade,
        purchaseUpgrade: state.purchaseUpgrade,
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
      // Ensure the loaded world has proper globals structure
      if (saveData.run.world.globals && !saveData.run.world.globals.unlocks) {
        saveData.run.world.globals.unlocks = {
          coolers: false,
          powerVeins: false,
          ghostBuilding: false,
          routingPriorities: false,
          diagnosticsTab: false,
          forkProcess: false,
          overclockMode: false,
          selfTermination: false,
          firstDroneFabricated: false,
          firstGhostPlaced: false,
          firstPrioritySet: false,
        };
      }
      // Defensive: ensure milestones is an array (older saves or manual edits may store as object)
      if (
        saveData.run.world.globals &&
        saveData.run.world.globals.milestones &&
        !Array.isArray(saveData.run.world.globals.milestones)
      ) {
        try {
          const vals = Object.values(saveData.run.world.globals.milestones as any);
          // Ensure flags exist on each milestone
          saveData.run.world.globals.milestones = vals.map((m: any) => ({
            achieved: false,
            notified: false,
            ...(m || {}),
          }));
        } catch (e) {
          // Fallback: ensure it's at least an empty array
          saveData.run.world.globals.milestones = [];
        }
      }

      set({
        ...saveData.meta,
        ...saveData.run,
      });
    }
  },
}));
