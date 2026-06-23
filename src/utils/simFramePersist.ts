import type { GameState } from "../store";

/**
 * Subset of `GameState` fields that we mirror from the sim worker each frame.
 * Kept in sync with the `frame.ui` payload plus `frame.delta.outposts`.
 */
export type PersistableGameFields = Pick<
  GameState,
  | "credits"
  | "prestigeLevel"
  | "droneCount"
  | "haulerCount"
  | "miningSpeedLevel"
  | "moveSpeedLevel"
  | "laserPowerLevel"
  | "minedBlocks"
  | "totalBlocks"
  | "outposts"
>;

export type OutpostLike = { id: string; x: number; y: number; z: number; level: number };

export type PersistableUi = Pick<
  PersistableGameFields,
  | "credits"
  | "prestigeLevel"
  | "droneCount"
  | "haulerCount"
  | "miningSpeedLevel"
  | "moveSpeedLevel"
  | "laserPowerLevel"
  | "minedBlocks"
  | "totalBlocks"
>;

/**
 * Shallow-compare two outpost lists. The sim worker emits a fresh array each
 * frame even when contents are unchanged, so a reference check alone is not
 * enough. Comparing length plus per-item identity markers keeps the cost
 * trivial while still avoiding redundant writes to the persistent store.
 */
export const outpostsUnchanged = (prev: OutpostLike[], next: OutpostLike[]): boolean => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a === b) continue;
    if (!a || !b) return false;
    if (a.id !== b.id || a.x !== b.x || a.y !== b.y || a.z !== b.z || a.level !== b.level) {
      return false;
    }
  }
  return true;
};

/**
 * Build a partial `GameState` patch containing only the fields whose value
 * changed since the last frame. Returning an empty object means "no update",
 * which Zustand treats as a no-op (no subscriber notifications, no persist
 * write).
 */
export const buildPersistedPatch = (
  prev: PersistableGameFields,
  ui: PersistableUi,
  outposts: OutpostLike[],
): Partial<PersistableGameFields> => {
  const patch: Record<string, unknown> = {};
  if (prev.credits !== ui.credits) patch.credits = ui.credits;
  if (prev.prestigeLevel !== ui.prestigeLevel) patch.prestigeLevel = ui.prestigeLevel;
  if (prev.droneCount !== ui.droneCount) patch.droneCount = ui.droneCount;
  if (prev.haulerCount !== ui.haulerCount) patch.haulerCount = ui.haulerCount;
  if (prev.miningSpeedLevel !== ui.miningSpeedLevel) patch.miningSpeedLevel = ui.miningSpeedLevel;
  if (prev.moveSpeedLevel !== ui.moveSpeedLevel) patch.moveSpeedLevel = ui.moveSpeedLevel;
  if (prev.laserPowerLevel !== ui.laserPowerLevel) patch.laserPowerLevel = ui.laserPowerLevel;
  if (prev.minedBlocks !== ui.minedBlocks) patch.minedBlocks = ui.minedBlocks;
  if (prev.totalBlocks !== ui.totalBlocks) patch.totalBlocks = ui.totalBlocks;
  if (!outpostsUnchanged(prev.outposts, outposts)) patch.outposts = outposts;
  return patch as Partial<PersistableGameFields>;
};