import { World } from "../ecs/world/World";
import { MetaSlice } from "./metaSlice";

const SAVE_KEY = "nanofactory-save";
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  timestamp: number;
  meta: {
    compileShardsBanked: number;
    totalPrestiges: number;
    swarmCognition: MetaSlice["swarmCognition"];
    bioStructure: MetaSlice["bioStructure"];
    compilerOptimization: MetaSlice["compilerOptimization"];
  };
  run: {
    world: World;
    projectedCompileShards: number;
    forkPoints: number;
    currentPhase: 1 | 2 | 3;
  };
}

export function saveGame(meta: MetaSlice, run: { world: World; projectedCompileShards: number; forkPoints: number; currentPhase: 1 | 2 | 3 }): boolean {
  try {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      meta: {
        compileShardsBanked: meta.compileShardsBanked,
        totalPrestiges: meta.totalPrestiges,
        swarmCognition: meta.swarmCognition,
        bioStructure: meta.bioStructure,
        compilerOptimization: meta.compilerOptimization,
      },
      run,
    };

    const serialized = JSON.stringify(saveData);
    localStorage.setItem(SAVE_KEY, serialized);
    console.log("Game saved successfully");
    return true;
  } catch (error) {
    console.error("Failed to save game:", error);
    return false;
  }
}

export function loadGame(): SaveData | null {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) return null;

    const saveData: SaveData = JSON.parse(serialized);
    
    // Version migration (for future use)
    if (saveData.version < SAVE_VERSION) {
      console.log(`Migrating save from version ${saveData.version} to ${SAVE_VERSION}`);
      // Add migration logic here when needed
    }

    console.log("Game loaded successfully");
    return saveData;
  } catch (error) {
    console.error("Failed to load game:", error);
    return null;
  }
}

export function deleteSave(): boolean {
  try {
    localStorage.removeItem(SAVE_KEY);
    console.log("Save deleted");
    return true;
  } catch (error) {
    console.error("Failed to delete save:", error);
    return false;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
