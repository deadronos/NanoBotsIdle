import React, { useState } from "react";

import { useGameStore } from "../store";
import type { ViewMode } from "../types";

interface UIProps {
  viewMode: ViewMode;
  onToggleView: () => void;
}

export const UI: React.FC<UIProps> = ({ viewMode, onToggleView }) => {
  const credits = useGameStore((state) => state.credits);
  const prestigeLevel = useGameStore((state) => state.prestigeLevel);
  const minedBlocks = useGameStore((state) => state.minedBlocks);
  const totalBlocks = useGameStore((state) => state.totalBlocks);

  const [isShopOpen, setShopOpen] = useState(false);

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
      <div className="absolute top-4 left-4 text-white opacity-80 hover:opacity-100 transition-opacity">
        <h1 className="text-2xl font-bold drop-shadow-md mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
          VOXEL WALKER
        </h1>
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
    </div>
  );
};

const ShopModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const store = useGameStore();

  // Stop click propagation to prevent pointer lock when clicking shop
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-2xl w-full shadow-2xl relative cursor-default"
        onClick={handleContainerClick}
        role="presentation"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          ✕
        </button>

        <h2 className="text-3xl font-bold text-white mb-6 border-b border-white/10 pb-4">
          Research & Development
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <UpgradeCard
            title="Drone Fleet"
            level={store.droneCount}
            cost={store.getUpgradeCost("drone")}
            onClick={() => store.buyUpgrade("drone")}
            canAfford={store.credits >= store.getUpgradeCost("drone")}
            desc="Add another autonomous mining unit."
          />
          <UpgradeCard
            title="Mining Drill"
            level={store.miningSpeedLevel}
            cost={store.getUpgradeCost("speed")}
            onClick={() => store.buyUpgrade("speed")}
            canAfford={store.credits >= store.getUpgradeCost("speed")}
            desc="Decreases time required to mine a block."
          />
          <UpgradeCard
            title="Thrusters"
            level={store.moveSpeedLevel}
            cost={store.getUpgradeCost("move")}
            onClick={() => store.buyUpgrade("move")}
            canAfford={store.credits >= store.getUpgradeCost("move")}
            desc="Drones fly faster between targets."
          />
          <UpgradeCard
            title="Laser Power"
            level={store.laserPowerLevel}
            cost={store.getUpgradeCost("laser")}
            onClick={() => store.buyUpgrade("laser")}
            canAfford={store.credits >= store.getUpgradeCost("laser")}
            desc="Increases beam intensity (visual)."
          />
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-purple-400">Planetary Jump (Prestige)</h3>
            <p className="text-sm text-purple-200/60 mt-1">
              Reset world generation. Keep upgrades. +1 Prestige Level.
            </p>
            <p className="text-xs text-purple-200/40 mt-1">Increases resource value multiplier.</p>
          </div>
          <button
            onClick={() => {
              store.resetPrestige();
              onClose();
            }}
            disabled={store.minedBlocks < 50} // Minimum requirement
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            {store.minedBlocks < 50 ? "Mine 50 Blocks first" : "WARP JUMP"}
          </button>
        </div>
      </div>
    </div>
  );
};

const UpgradeCard: React.FC<{
  title: string;
  level: number;
  cost: number;
  onClick: () => void;
  canAfford: boolean;
  desc: string;
}> = ({ title, level, cost, onClick, canAfford, desc }) => (
  <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-bold text-white text-lg">{title}</h3>
      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Lv. {level}</span>
    </div>
    <p className="text-xs text-gray-400 mb-4 h-8">{desc}</p>
    <button
      onClick={onClick}
      disabled={!canAfford}
      className={`w-full py-2 rounded font-bold text-sm flex justify-center items-center gap-1 ${
        canAfford
          ? "bg-green-600 hover:bg-green-500 text-white"
          : "bg-gray-700 text-gray-400 cursor-not-allowed"
      }`}
    >
      Buy ${cost.toLocaleString()}
    </button>
  </div>
);
