/**
 * Migration registry and execution logic.
 *
 * Register migrations here to ensure saves can be upgraded across versions.
 * Migrations run sequentially from the save's version to the current version.
 */

import type { Migration } from "./types";
import { migrateV1ToV2 } from "./v1-to-v2";

/**
 * All registered migrations, sorted by version.
 * Add new migrations here as the save format evolves.
 */
const migrations: Migration[] = [
  migrateV1ToV2,
  // Future migrations go here:
  // migrateV2ToV3,
  // migrateV3ToV4,
];

/**
 * Get all migrations needed to upgrade from a given version to target version.
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Ordered list of migrations to apply
 */
export function getMigrationsPath(fromVersion: number, toVersion: number): Migration[] {
  if (fromVersion === toVersion) {
    return [];
  }

  if (fromVersion > toVersion) {
    throw new Error(`Cannot downgrade saves from v${fromVersion} to v${toVersion}`);
  }

  const path: Migration[] = [];
  let currentVersion = fromVersion;

  while (currentVersion < toVersion) {
    const migration = migrations.find(
      (m) => m.fromVersion === currentVersion && m.toVersion === currentVersion + 1,
    );

    if (!migration) {
      throw new Error(
        `No migration found from v${currentVersion} to v${currentVersion + 1}. ` +
          `Cannot upgrade save from v${fromVersion} to v${toVersion}.`,
      );
    }

    path.push(migration);
    currentVersion = migration.toVersion;
  }

  return path;
}

/**
 * Apply a sequence of migrations to save data.
 * @param data - Initial save data
 * @param migrationsToApply - Ordered migrations to execute
 * @returns Transformed save data
 */
export function applyMigrations(data: unknown, migrationsToApply: Migration[]): unknown {
  let current = data;

  for (const migration of migrationsToApply) {
    try {
      current = migration.migrate(current);
    } catch (err) {
      throw new Error(
        `Migration failed (v${migration.fromVersion}→v${migration.toVersion}): ${migration.description}. ${err}`,
      );
    }
  }

  return current;
}
