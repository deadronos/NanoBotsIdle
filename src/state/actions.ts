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
