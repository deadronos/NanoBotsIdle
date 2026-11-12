import { create } from "zustand";

import type { MiningZone } from "../shared/miningOperations";
import type { UiSnapshot } from "../shared/protocol";
import type { estimateOutpost } from "./outpostPreview";

type UiState = {
  snapshot: UiSnapshot;
  setSnapshot: (snapshot: UiSnapshot) => void;
  buildingMode: "NONE" | "OUTPOST" | "MINING_ZONE";
  setBuildingMode: (mode: UiState["buildingMode"]) => void;
  placement?: MiningZone;
  outpostPreview?: ReturnType<typeof estimateOutpost>;
  setOutpostPreview: (preview?: ReturnType<typeof estimateOutpost>) => void;
  setPlacement: (placement: MiningZone) => void;
};

const defaultSnapshot: UiSnapshot = {
  credits: 0,
  creditsPerMinute: 0,
  cargoInTransit: 0,
  prestigeLevel: 1,
  droneCount: 3,
  haulerCount: 0,
  miningSpeedLevel: 1,
  moveSpeedLevel: 1,
  laserPowerLevel: 1,
  minedBlocks: 0,
  totalBlocks: 0,
  outposts: [],
};

export const useUiStore = create<UiState>((set) => ({
  snapshot: defaultSnapshot,
  buildingMode: "NONE",
  setSnapshot: (snapshot) =>
    set((state) =>
      snapshot.prestigeLevel === state.snapshot.prestigeLevel ?
        { snapshot }
      : {
          snapshot,
          buildingMode: "NONE",
          placement: undefined,
          outpostPreview: undefined,
        },
    ),
  setBuildingMode: (mode) =>
    set({ buildingMode: mode, placement: undefined, outpostPreview: undefined }),
  setPlacement: (placement) => set({ placement, outpostPreview: undefined }),
  setOutpostPreview: (outpostPreview) => set({ outpostPreview }),
}));
