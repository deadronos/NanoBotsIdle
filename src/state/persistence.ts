import { World } from "../ecs/world/World";
import { MetaSlice } from "./metaSlice";
import { migrateSaveData, validateSaveData } from "./migrations";

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

export function saveGame(
  meta: MetaSlice,
  run: { world: World; projectedCompileShards: number; forkPoints: number; currentPhase: 1 | 2 | 3 }
): boolean {
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
    if (!serialized) {
      console.log("No save found");
      return null;
    }

    const rawData = JSON.parse(serialized);

    // Validate save data structure
    if (!validateSaveData(rawData)) {
      console.error("Invalid save data structure. Save may be corrupted.");
      return null;
    }

    let saveData: SaveData = rawData;

    // Apply migrations if needed
    if (saveData.version < SAVE_VERSION) {
      console.log(`Migrating save from version ${saveData.version} to ${SAVE_VERSION}`);
      try {
        saveData = migrateSaveData(saveData, SAVE_VERSION);
      } catch (error) {
        console.error("Migration failed:", error);
        return null;
      }
    }

    console.log("Game loaded successfully", {
      version: saveData.version,
      timestamp: new Date(saveData.timestamp).toISOString(),
      shards: saveData.meta.compileShardsBanked,
      prestiges: saveData.meta.totalPrestiges,
    });

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

/**
 * Export save data as a JSON string for backup/sharing
 */
export function exportSave(): string | null {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) {
      console.warn("No save to export");
      return null;
    }

    // Validate before exporting
    const saveData = JSON.parse(serialized);
    if (!validateSaveData(saveData)) {
      console.error("Cannot export invalid save data");
      return null;
    }

    return serialized;
  } catch (error) {
    console.error("Failed to export save:", error);
    return null;
  }
}

/**
 * Import save data from a JSON string
 */
export function importSave(jsonString: string): boolean {
  try {
    const saveData = JSON.parse(jsonString);

    // Validate imported data
    if (!validateSaveData(saveData)) {
      console.error("Invalid save data format in import");
      return false;
    }

    // Apply migrations if needed
    let migratedData = saveData;
    if (saveData.version < SAVE_VERSION) {
      console.log(`Migrating imported save from v${saveData.version} to v${SAVE_VERSION}`);
      migratedData = migrateSaveData(saveData, SAVE_VERSION);
    }

    // Save to localStorage
    localStorage.setItem(SAVE_KEY, JSON.stringify(migratedData));
    console.log("Save imported successfully");
    return true;
  } catch (error) {
    console.error("Failed to import save:", error);
    return false;
  }
}

/**
 * Get save metadata without loading the full save
 */
export function getSaveMetadata(): {
  version: number;
  timestamp: number;
  shards: number;
  prestiges: number;
} | null {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) return null;

    const saveData = JSON.parse(serialized);

    // Validate structure before accessing properties
    if (!validateSaveData(saveData)) {
      console.error("Invalid save data structure in metadata retrieval");
      return null;
    }

    return {
      version: saveData.version,
      timestamp: saveData.timestamp,
      shards: saveData.meta.compileShardsBanked,
      prestiges: saveData.meta.totalPrestiges,
    };
  } catch (error) {
    console.error("Failed to get save metadata:", error);
    return null;
  }
}
