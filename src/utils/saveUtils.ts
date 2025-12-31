import { useGameStore } from "../store";
import { error, warn } from "./logger";
import { applyMigrations, getMigrationsPath } from "./migrations/registry";
import type { SaveData } from "./migrations/types";
import { CURRENT_SAVE_VERSION } from "./migrations/types";
import {
  sanitizeGameState,
  validateGameState,
  validateSaveStructure,
} from "./migrations/validation";

/**
 * Export current game state as a versioned save file.
 * The save includes metadata (version, date) for migration support.
 */
export const exportSave = () => {
  const state = useGameStore.getState();

  // Extract only the data fields (exclude actions)
  const { addCredits: _addCredits, incrementMinedBlocks: _incrementMinedBlocks, setTotalBlocks: _setTotalBlocks, buyUpgrade: _buyUpgrade, resetPrestige: _resetPrestige, getUpgradeCost: _getUpgradeCost, ...dataFields } = state;

  const saveData: SaveData = {
    version: CURRENT_SAVE_VERSION,
    date: new Date().toISOString(),
    data: dataFields,
  };

  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voxel-walker-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Import a save file, applying migrations and validation.
 * @param file - The save file to import
 * @returns Promise that resolves on success or rejects with an error message
 */
export const importSave = (file: File) => {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text) as unknown;

        // Step 1: Validate save structure
        const structureValidation = validateSaveStructure(json);
        if (!structureValidation.valid) {
          const errorMsg = "Invalid save file:\n" + structureValidation.errors.join("\n");
          error(errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        // Log warnings if present
        if (structureValidation.warnings.length > 0) {
          structureValidation.warnings.forEach((warning) => warn(warning));
        }

        const saveData = json as SaveData;

        // Step 2: Apply migrations if needed
        let migratedData = saveData.data;
        if (saveData.version < CURRENT_SAVE_VERSION) {
          try {
            const migrations = getMigrationsPath(saveData.version, CURRENT_SAVE_VERSION);
            migratedData = applyMigrations(saveData.data, migrations) as Partial<typeof migratedData>;
          } catch (err) {
            const errorMsg = `Failed to migrate save from v${saveData.version} to v${CURRENT_SAVE_VERSION}: ${err}`;
            error(errorMsg);
            reject(new Error(errorMsg));
            return;
          }
        }

        // Step 3: Validate game state
        const stateValidation = validateGameState(migratedData);
        if (!stateValidation.valid) {
          const errorMsg = "Invalid game state in save file:\n" + stateValidation.errors.join("\n");
          error(errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        // Log warnings if present
        if (stateValidation.warnings.length > 0) {
          stateValidation.warnings.forEach((warning) => warn(warning));
        }

        // Step 4: Sanitize data and apply to store
        const sanitizedData = sanitizeGameState(migratedData);
        useGameStore.setState(sanitizedData);

        resolve();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error during import";
        error("Failed to import save:", errorMsg);
        reject(new Error(errorMsg));
      }
    };
    reader.onerror = () => {
      const errorMsg = "Failed to read save file";
      error(errorMsg);
      reject(new Error(errorMsg));
    };
    reader.readAsText(file);
  });
};

export const resetGame = () => {
  localStorage.removeItem("voxel-walker-storage");
  window.location.reload();
};
