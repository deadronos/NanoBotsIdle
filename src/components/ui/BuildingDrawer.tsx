import React, { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { useConfig } from "../../config/useConfig";
import { DOCK_CAPACITY } from "../../shared/miningOperations";
import { getSimBridge } from "../../simBridge/simBridge";
import { canPreviewOutpost, estimateOutpost } from "../../ui/outpostPreview";
import { useUiStore } from "../../ui/store";

const EMPTY_DOCK_STATUS: string[] = [];

export const BuildingDrawer: React.FC<{ open: boolean; onToggle: () => void }> = ({
  open,
  onToggle,
}) => {
  const mode = useUiStore((state) => state.buildingMode);
  const placement = useUiStore((state) => state.placement);
  const credits = useUiStore((state) => state.snapshot.credits);
  const dockStatus = useUiStore(
    useShallow((state) =>
      !open ? EMPTY_DOCK_STATUS : (
        state.snapshot.outposts.map(
          (outpost, index) =>
            `${index === 0 ? "Starter outpost" : `Outpost ${index + 1}`}: ${outpost.dockedCount ?? 0}/${DOCK_CAPACITY} docked · ${outpost.queuedCount ?? 0} waiting`,
        )
      ),
    ),
  );
  const setMode = useUiStore((state) => state.setBuildingMode);
  const cfg = useConfig();
  const cost = cfg.economy.baseCosts.outpost;
  const estimate = useUiStore(
    useShallow((state) => ({
      diverted: state.outpostPreview?.diverted,
      blocksSaved: state.outpostPreview?.blocksSaved,
    })),
  );
  const valid = estimate.diverted !== undefined;
  const waterLevel = cfg.terrain.waterLevel;

  useEffect(() => {
    if (mode !== "OUTPOST" || !placement) return;
    let lastUpdate = -Infinity;
    return getSimBridge().onFrame(({ delta }) => {
      const now = performance.now();
      if (now - lastUpdate < 100) return;
      lastUpdate = now;
      const state = useUiStore.getState();
      if (state.placement !== placement || state.buildingMode !== "OUTPOST") return;
      state.setOutpostPreview(
        canPreviewOutpost(placement, waterLevel, delta.outposts ?? []) ?
          estimateOutpost(placement, delta)
        : undefined,
      );
    });
  }, [mode, placement, waterLevel]);

  return (
    <div className="md:relative">
      <button
        className="game-control"
        aria-expanded={(open && mode === "NONE") || mode === "OUTPOST"}
        onClick={() => {
          if (mode === "OUTPOST") setMode("NONE");
          else {
            if (mode !== "NONE") setMode("NONE");
            onToggle();
          }
        }}
      >
        Build
      </button>
      {open && mode === "NONE" && (
        <div className="game-panel absolute top-full left-0 z-10 mt-2 w-52 max-h-52 overflow-y-auto p-2 text-xs">
          <button
            className="game-control"
            onClick={() => {
              setMode("OUTPOST");
              onToggle();
            }}
          >
            Outpost · ${cost.toLocaleString()}
          </button>
          <ul className="space-y-1 px-2 pb-1">
            {dockStatus.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {mode === "OUTPOST" && (
        <div className="game-panel absolute top-full left-0 z-10 mt-2 w-48 p-2 text-xs">
          <p className="px-2 py-1">
            {!placement ?
              "Select terrain to preview an outpost."
            : !valid ?
              "Choose dry ground away from other outposts."
            : `Estimated: ${estimate.diverted ?? 0} drones routed here · ${Math.abs(estimate.blocksSaved ?? 0)} blocks ${(estimate.blocksSaved ?? 0) < 0 ? "added" : "saved"} per combined return.`
            }
          </p>
          <button
            className="game-control disabled:opacity-40"
            disabled={!valid || credits < cost}
            onClick={() => {
              if (!placement) return;
              getSimBridge().enqueue({ t: "BUILD_OUTPOST", ...placement });
              setMode("NONE");
            }}
          >
            Build · ${cost.toLocaleString()}
          </button>
          <button className="game-control" onClick={() => setMode("NONE")}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
