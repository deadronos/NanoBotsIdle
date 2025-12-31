/**
 * Migration from save version 1 to version 2.
 *
 * Changes in v2:
 * - Added explicit totalBlocks field initialization (was implicit/missing in v1)
 * - Ensures all GameState fields have default values
 *
 * This is a minimal example migration. Real migrations would handle
 * more substantial schema changes like renaming fields or restructuring data.
 */

import type { Migration } from "./types";

/**
 * V1 save data structure (legacy).
 */
interface SaveDataV1 {
  credits?: number;
  prestigeLevel?: number;
  droneCount?: number;
  miningSpeedLevel?: number;
  moveSpeedLevel?: number;
  laserPowerLevel?: number;
  minedBlocks?: number;
  // totalBlocks was optional/missing in v1
}

/**
 * V2 save data structure (current).
 */
interface SaveDataV2 {
  credits: number;
  prestigeLevel: number;
  droneCount: number;
  miningSpeedLevel: number;
  moveSpeedLevel: number;
  laserPowerLevel: number;
  minedBlocks: number;
  totalBlocks: number; // Now required in v2
}

/**
 * Transform v1 save data to v2 format.
 */
function transformV1ToV2(v1Data: SaveDataV1): SaveDataV2 {
  return {
    credits: v1Data.credits ?? 0,
    prestigeLevel: v1Data.prestigeLevel ?? 1,
    droneCount: v1Data.droneCount ?? 3,
    miningSpeedLevel: v1Data.miningSpeedLevel ?? 1,
    moveSpeedLevel: v1Data.moveSpeedLevel ?? 1,
    laserPowerLevel: v1Data.laserPowerLevel ?? 1,
    minedBlocks: v1Data.minedBlocks ?? 0,
    totalBlocks: 0, // Initialize to 0 if missing (will be set by World component)
  };
}

/**
 * Migration registration for v1→v2.
 */
export const migrateV1ToV2: Migration = {
  fromVersion: 1,
  toVersion: 2,
  description: "Add totalBlocks field and ensure all fields have defaults",
  migrate: (data: unknown): SaveDataV2 => {
    // Type guard: ensure data is an object
    if (!data || typeof data !== "object") {
      throw new Error("Invalid v1 save data: expected object");
    }

    return transformV1ToV2(data as SaveDataV1);
  },
};
