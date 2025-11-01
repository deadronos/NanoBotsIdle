import { useGameStore } from "./store";

export const placeBuilding = (type: string, x: number, y: number): void => {
  useGameStore.getState().placeBuilding(type, x, y);
};

export const queueGhostBuilding = (
  type: string,
  x: number,
  y: number,
): void => {
  useGameStore.getState().queueGhostBuilding(type, x, y);
};

export const triggerFork = (): void => {
  useGameStore.getState().triggerFork();
};

export const toggleOverclock = (on: boolean): void => {
  useGameStore.getState().toggleOverclock(on);
};

export const prestigeNow = (): void => {
  useGameStore.getState().prestigeNow();
};

export const startPlacement = (type: string | null): void => {
  useGameStore.getState().startPlacement(type);
};

export const cancelPlacement = (): void => {
  useGameStore.getState().cancelPlacement();
};

export const confirmPlacementAt = (x: number, y: number): void => {
  useGameStore.getState().confirmPlacementAt(x, y);
};

export const removeQueuedGhost = (id: string): void => {
  useGameStore.getState().removeQueuedGhost(id);
};

export const setPlacementMessage = (msg: string | null): void => {
  useGameStore.getState().setPlacementMessage(msg);
};

export const removePlacementMessage = (): void => {
  useGameStore.getState().removePlacementMessage();
};

export const applyUpgrade = (upgradeId: string, targetEntityId?: number | null): void => {
  useGameStore.getState().applyUpgrade(upgradeId, targetEntityId ?? null);
};
