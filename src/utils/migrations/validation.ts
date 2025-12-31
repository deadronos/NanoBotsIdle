/**
 * Save data validation utilities.
 * 
 * Validates the structure and content of imported save data,
 * providing clear error messages for debugging and user feedback.
 */

import type { GameState } from "../../store";
import type { SaveData, ValidationResult } from "./types";
import { CURRENT_SAVE_VERSION } from "./types";

/**
 * Validate the basic structure of a save file.
 * @param json - Parsed JSON from save file
 * @returns Validation result with errors and warnings
 */
export function validateSaveStructure(json: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's an object
  if (!json || typeof json !== "object") {
    errors.push("Save file must be a valid JSON object");
    return { valid: false, errors, warnings };
  }

  const save = json as Partial<SaveData>;

  // Check for required top-level fields
  if (typeof save.version !== "number") {
    errors.push("Save file missing required 'version' field");
  } else if (save.version < 1) {
    errors.push(`Invalid version number: ${save.version} (must be >= 1)`);
  } else if (save.version > CURRENT_SAVE_VERSION) {
    warnings.push(
      `Save file version (v${save.version}) is newer than this app (v${CURRENT_SAVE_VERSION}). ` +
        `Some features may not work correctly. Please update the app.`,
    );
  }

  if (typeof save.date !== "string") {
    warnings.push("Save file missing 'date' field (non-critical)");
  }

  if (!save.data || typeof save.data !== "object") {
    errors.push("Save file missing required 'data' field");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate game state data fields.
 * @param data - Game state to validate
 * @returns Validation result with errors and warnings
 */
export function validateGameState(data: Partial<GameState>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check numeric fields are valid
  const numericFields: Array<keyof GameState> = [
    "credits",
    "prestigeLevel",
    "droneCount",
    "miningSpeedLevel",
    "moveSpeedLevel",
    "laserPowerLevel",
    "minedBlocks",
    "totalBlocks",
  ];

  for (const field of numericFields) {
    const value = data[field];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
      errors.push(`Field '${field}' must be a finite number, got: ${typeof value}`);
    }
  }

  // Check for reasonable value ranges
  if (typeof data.credits === "number" && data.credits < 0) {
    warnings.push(`Credits value is negative (${data.credits}), will be clamped to 0`);
  }

  if (typeof data.prestigeLevel === "number" && data.prestigeLevel < 1) {
    warnings.push(
      `Prestige level is less than 1 (${data.prestigeLevel}), will be clamped to 1`,
    );
  }

  if (typeof data.droneCount === "number" && data.droneCount < 1) {
    warnings.push(`Drone count is less than 1 (${data.droneCount}), will be clamped to 1`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize game state data to ensure all values are within acceptable ranges.
 * @param data - Game state to sanitize
 * @returns Sanitized game state
 */
export function sanitizeGameState(data: Partial<GameState>): Partial<GameState> {
  return {
    ...data,
    credits: Math.max(0, data.credits ?? 0),
    prestigeLevel: Math.max(1, data.prestigeLevel ?? 1),
    droneCount: Math.max(1, data.droneCount ?? 3),
    miningSpeedLevel: Math.max(1, data.miningSpeedLevel ?? 1),
    moveSpeedLevel: Math.max(1, data.moveSpeedLevel ?? 1),
    laserPowerLevel: Math.max(1, data.laserPowerLevel ?? 1),
    minedBlocks: Math.max(0, data.minedBlocks ?? 0),
    totalBlocks: Math.max(0, data.totalBlocks ?? 0),
  };
}
