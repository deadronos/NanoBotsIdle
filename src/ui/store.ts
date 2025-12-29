import { create } from "zustand";

import type { UiSnapshot } from "../shared/protocol";

type UiState = {
  snapshot: UiSnapshot;
  setSnapshot: (snapshot: UiSnapshot) => void;
};

const defaultSnapshot: UiSnapshot = {
  credits: 0,
  prestigeLevel: 1,
  droneCount: 3,
  miningSpeedLevel: 1,
  moveSpeedLevel: 1,
  laserPowerLevel: 1,
  minedBlocks: 0,
  totalBlocks: 0,
  upgrades: {},
};

export const useUiStore = create<UiState>((set) => ({
  snapshot: defaultSnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
}));
