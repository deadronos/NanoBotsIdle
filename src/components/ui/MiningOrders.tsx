import React from "react";

import { MINING_ZONE_RADIUS } from "../../shared/miningOperations";
import { getSimBridge } from "../../simBridge/simBridge";
import { useUiStore } from "../../ui/store";

export const MiningOrders: React.FC<{ open: boolean; onToggle: () => void }> = ({
  open,
  onToggle,
}) => {
  const mode = useUiStore((state) => state.buildingMode);
  const setMode = useUiStore((state) => state.setBuildingMode);
  const placement = useUiStore((state) => state.placement);
  const hasZone = useUiStore((state) => !!state.snapshot.miningZone);
  const assigned = useUiStore((state) => state.snapshot.zoneAssigned ?? 0);
  const targets = useUiStore((state) => state.snapshot.zoneTargets ?? 0);
  const selecting = mode === "MINING_ZONE";

  return (
    <div className="md:relative">
      <button
        className={`game-control ${hasZone ? "text-emerald-300" : ""}`}
        aria-expanded={selecting || (open && mode === "NONE")}
        onClick={() => {
          if (selecting) {
            setMode("NONE");
          } else {
            if (mode !== "NONE") setMode("NONE");
            onToggle();
          }
        }}
      >
        Mining{hasZone ? ` · ${assigned}` : ""}
      </button>
      {(selecting || (open && mode === "NONE")) && (
        <div className="game-panel absolute top-full left-0 z-10 mt-2 w-44 p-2 text-xs">
          <p className="px-2 py-1">
            {selecting ?
              `Select terrain for a ${MINING_ZONE_RADIUS}-block radius.`
            : !hasZone ?
              "Automatic mining"
            : targets === 0 ?
              "Zone exhausted"
            : `${assigned} miners assigned · ${targets} exposed blocks`}
          </p>
          {selecting ?
            <>
              <button
                className="game-control disabled:opacity-40"
                disabled={!placement}
                onClick={() => {
                  if (!placement) return;
                  getSimBridge().enqueue({ t: "SET_MINING_ZONE", zone: placement });
                  setMode("NONE");
                }}
              >
                Confirm zone
              </button>
              <button className="game-control" onClick={() => setMode("NONE")}>
                Cancel
              </button>
            </>
          : <>
              <button className="game-control" onClick={() => setMode("MINING_ZONE")}>
                {hasZone ? "Move zone" : "Set zone"}
              </button>
              {hasZone && (
                <button
                  className="game-control"
                  onClick={() => getSimBridge().enqueue({ t: "CLEAR_MINING_ZONE" })}
                >
                  Clear
                </button>
              )}
            </>
          }
        </div>
      )}
    </div>
  );
};
