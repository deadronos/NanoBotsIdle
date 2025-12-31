/**
 * Save data versioning and migration types.
 * 
 * The save format evolves over time; migrations ensure backward compatibility.
 */

import type { GameState } from "../../store";

/**
 * Current save format version.
 * Increment this when making breaking changes to the save structure.
 */
export const CURRENT_SAVE_VERSION = 2;

/**
 * Versioned save data wrapper.
 * All exported saves include this metadata.
 */
export interface SaveData {
  version: number;
  date: string;
  data: Partial<GameState>; // Partial to handle evolving schema
}

/**
 * Result of save validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * A migration function transforms save data from one version to the next.
 * @param data - The save data at the source version
 * @returns The transformed save data at the target version
 */
export type MigrationFn = (data: unknown) => unknown;

/**
 * Migration metadata for registration and documentation.
 */
export interface Migration {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: MigrationFn;
}
