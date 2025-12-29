import React from "react";

import type { ViewMode } from "../../types";

export const ViewControls: React.FC<{
  viewMode: ViewMode;
  onToggleView: () => void;
  onOpenShop: () => void;
}> = ({ viewMode, onToggleView, onOpenShop }) => {
  return (
    <div className="absolute top-4 right-4 pointer-events-auto flex flex-col gap-2 items-end">
      <button
        onClick={onToggleView}
        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold transition-all border border-white/20 text-sm shadow-lg active:scale-95 flex items-center gap-2"
      >
        {viewMode === "FIRST_PERSON" ? "3rd Person" : "1st Person"}
      </button>

      <button
        onClick={onOpenShop}
        className="bg-blue-600/80 hover:bg-blue-500 backdrop-blur-md text-white px-6 py-3 rounded-xl font-bold transition-all border border-blue-400/50 shadow-lg active:scale-95 flex items-center gap-2"
      >
        Research Lab
      </button>
    </div>
  );
};

