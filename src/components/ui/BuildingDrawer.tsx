import React, { useState } from "react";

import { useUiStore } from "../../ui/store";

export const BuildingDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const buildingMode = useUiStore((state) => state.buildingMode);
  const setBuildingMode = useUiStore((state) => state.setBuildingMode);

  return (
    <div className="relative">
      <button
        className="game-control"
        aria-expanded={isOpen}
        onClick={() => {
          if (buildingMode !== "NONE") {
            setBuildingMode("NONE");
          } else {
            setIsOpen(!isOpen);
          }
        }}
      >
        Build
      </button>
      {isOpen && buildingMode === "NONE" && (
        <div className="game-panel absolute top-full left-0 z-10 mt-2 p-1">
          <button
            className="game-control"
            onClick={() => {
              setBuildingMode("OUTPOST");
              setIsOpen(false);
            }}
          >
            Outpost
          </button>
        </div>
      )}
      {buildingMode !== "NONE" && (
        <div className="game-panel absolute top-full left-0 z-10 mt-2 w-max max-w-48 p-2 text-xs">
          <p className="px-2 py-1">Select terrain to place outpost.</p>
          <button className="game-control" onClick={() => setBuildingMode("NONE")}>
            Cancel placement
          </button>
        </div>
      )}
    </div>
  );
};
