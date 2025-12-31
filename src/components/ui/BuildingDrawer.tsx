import React, { useState } from "react";
import { useUiStore } from "../../ui/store";

export const BuildingDrawer: React.FC<{ className?: string }> = ({
  className = "absolute top-40 left-4",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buildingMode = useUiStore((state) => state.buildingMode);
  const setBuildingMode = useUiStore((state) => state.setBuildingMode);

  const toggleDrawer = () => setIsOpen(!isOpen);

  const selectBuilding = (mode: "OUTPOST") => {
    if (buildingMode === mode) {
      setBuildingMode("NONE");
    } else {
      setBuildingMode(mode);
    }
  };

  return (
    <div className={`${className} z-10 pointer-events-none flex flex-col items-start gap-2`}>
      {/* Trigger Button */}
      <button
        onClick={toggleDrawer}
        className="pointer-events-auto bg-slate-800/80 backdrop-blur border border-slate-600 p-2 rounded text-slate-200 hover:bg-slate-700 transition"
        title="Buildings"
      >
        <span role="img" aria-label="Build">
          🏗️
        </span>
      </button>

      {/* Drawer */}
      {isOpen && (
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-600 rounded p-2 flex flex-col gap-2 min-w-[120px]">
          <h3 className="text-xs uppercase text-slate-400 font-bold mb-1">Structures</h3>
          <button
            onClick={() => selectBuilding("OUTPOST")}
            className={`flex items-center gap-2 p-2 rounded text-sm transition ${
              buildingMode === "OUTPOST" ? "bg-blue-600 text-white" : (
                "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )
            }`}
          >
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-xs">
              🏠
            </div>
            <span>Outpost</span>
          </button>
        </div>
      )}

      {/* Cancel Helper */}
      {buildingMode !== "NONE" && (
        <div className="pointer-events-auto bg-slate-900/80 p-2 rounded text-xs text-white border border-blue-500">
          Click terrain to place <br />
          <button
            onClick={() => setBuildingMode("NONE")}
            className="mt-1 w-full bg-red-600/50 hover:bg-red-600 rounded px-1 py-0.5"
          >
            Cancel (ESC)
          </button>
        </div>
      )}
    </div>
  );
};
