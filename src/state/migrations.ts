import { SaveData } from "./persistence";

/**
 * Migration system for handling save format changes across versions.
 * Each migration function transforms save data from version N to N+1.
 */

export type MigrationFunction = (saveData: SaveData) => SaveData;

/**
 * Registry of all migrations, indexed by source version.
 * migrations[1] migrates from v1 to v2, migrations[2] from v2 to v3, etc.
 */
export const migrations: Record<number, MigrationFunction> = {
  // Example: Migration from v1 to v2
  // 1: (saveData: SaveData): SaveData => {
  //   return {
  //     ...saveData,
  //     version: 2,
  //     // Add any new fields or transform existing ones
  //   };
  // },
};

/**
 * Apply all necessary migrations to bring save data up to the target version.
 * @param saveData The save data to migrate
 * @param targetVersion The version to migrate to
 * @returns Migrated save data
 */
export function migrateSaveData(saveData: SaveData, targetVersion: number): SaveData {
  let currentData = { ...saveData };
  let currentVersion = saveData.version;

  // Validate that we can migrate
  if (currentVersion > targetVersion) {
    console.warn(
      `Save data version (${currentVersion}) is newer than supported version (${targetVersion}). Loading anyway, but may cause issues.`
    );
    return currentData;
  }

  // Apply migrations sequentially
  while (currentVersion < targetVersion) {
    const migration = migrations[currentVersion];

    if (!migration) {
      console.warn(
        `No migration found for version ${currentVersion} -> ${currentVersion + 1}. Skipping.`
      );
      currentVersion++;
      continue;
    }

    console.log(`Migrating save data: v${currentVersion} -> v${currentVersion + 1}`);
    try {
      currentData = migration(currentData);
      currentVersion++;
    } catch (error) {
      console.error(`Migration failed at version ${currentVersion}:`, error);
      throw new Error(`Failed to migrate save data from version ${currentVersion}`);
    }
  }

  return currentData;
}

/**
 * Validate that save data has the minimum required structure.
 * Returns true if valid, false otherwise.
 */
export function validateSaveData(data: unknown): data is SaveData {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const saveData = data as Partial<SaveData>;

  // Check required top-level fields
  if (typeof saveData.version !== "number") {
    return false;
  }

  if (typeof saveData.timestamp !== "number") {
    return false;
  }

  // Check meta structure
  if (typeof saveData.meta !== "object" || saveData.meta === null) {
    return false;
  }

  const meta = saveData.meta;
  if (
    typeof meta.compileShardsBanked !== "number" ||
    typeof meta.totalPrestiges !== "number"
  ) {
    return false;
  }

  // Check run structure
  if (typeof saveData.run !== "object" || saveData.run === null) {
    return false;
  }

  const run = saveData.run;
  if (typeof run.world !== "object" || run.world === null) {
    return false;
  }

  return true;
}
