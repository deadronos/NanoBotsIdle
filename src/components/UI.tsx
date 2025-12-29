import React, { useState } from "react";

import type { ViewMode } from "../types";
import { useUiStore } from "../ui/store";
import { SettingsModal } from "./SettingsModal";
import { ShopModal } from "./ui/ShopModal";

interface UIProps {
  viewMode: ViewMode;
  onToggleView: () => void;
}

export const UI: React.FC<UIProps> = ({ viewMode, onToggleView }) => {
  const snapshot = useUiStore((state) => state.snapshot);
  const credits = snapshot.credits;
  const prestigeLevel = snapshot.prestigeLevel;
  const minedBlocks = snapshot.minedBlocks;
  const totalBlocks = snapshot.totalBlocks;
  const [isShopOpen, setShopOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const percentMined = totalBlocks > 0 ? (minedBlocks / totalBlocks) * 100 : 0;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 font-sans">
      {/* Top Center: HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-yellow-500/30 flex flex-col items-center">
          <span className="text-yellow-400 font-bold text-xl tracking-wider">
            ${credits.toLocaleString()}
          </span>
          <span className="text-xs text-yellow-100/50 uppercase">Credits</span>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-purple-500/30 flex flex-col items-center">
          <span className="text-purple-400 font-bold text-xl tracking-wider">
            Lv. {prestigeLevel}
          </span>
          <span className="text-xs text-purple-100/50 uppercase">Prestige</span>
        </div>
      </div>

      {/* Top Right: View Toggle */}
      <div className="absolute top-4 right-4 pointer-events-auto flex flex-col gap-2 items-end">
        <button
          onClick={onToggleView}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold transition-all border border-white/20 text-sm shadow-lg active:scale-95 flex items-center gap-2"
        >
          {viewMode === "FIRST_PERSON" ? "3rd Person" : "1st Person"}
        </button>

        <button
          onClick={() => setShopOpen(true)}
          className="bg-blue-600/80 hover:bg-blue-500 backdrop-blur-md text-white px-6 py-3 rounded-xl font-bold transition-all border border-blue-400/50 shadow-lg active:scale-95 flex items-center gap-2"
        >
          Research Lab
        </button>
      </div>

      {/* Top Left: Title & Controls (Collapsed slightly) */}
      <div className="absolute top-4 left-4 text-white opacity-80 hover:opacity-100 transition-opacity pointer-events-auto">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold drop-shadow-md tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
            VOXEL WALKER
          </h1>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-white/50 hover:text-white hover:rotate-90 transition-all"
            title="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.076.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.433.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <div className="text-xs text-white/60 bg-black/40 p-2 rounded">
          WASD to Move | Shift to Run | Click to Lock
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-48 bg-gray-800 rounded-full h-2.5 dark:bg-gray-700 border border-white/10">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all duration-1000"
            style={{ width: `${percentMined}%` }}
          ></div>
        </div>
        <div className="text-xs mt-1 text-green-400">{percentMined.toFixed(1)}% Mined</div>
      </div>

      {/* Reticle */}
      {viewMode === "FIRST_PERSON" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/80 rounded-full mix-blend-difference pointer-events-none" />
      )}

      {/* Shop Modal */}
      {isShopOpen && <ShopModal onClose={() => setShopOpen(false)} />}

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
