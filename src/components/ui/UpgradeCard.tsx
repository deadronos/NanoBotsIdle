import React from "react";

type UpgradeCardProps = {
  title: string;
  level: number;
  cost: number;
  onClick: () => void;
  canAfford: boolean;
  desc: string;
  isMaxLevel?: boolean;
};

export const UpgradeCard: React.FC<UpgradeCardProps> = ({
  title,
  level,
  cost,
  onClick,
  canAfford,
  desc,
  isMaxLevel = false,
}) => (
  <div
    className={`bg-white/5 p-4 rounded-xl border transition-colors ${
      isMaxLevel ? "border-amber-400/30 hover:border-amber-300/40" : "border-white/5 hover:border-white/20"
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-bold text-white text-lg">{title}</h3>
      <span
        className={`text-xs px-2 py-1 rounded ${
          isMaxLevel ? "bg-amber-500/20 text-amber-200" : "bg-blue-500/20 text-blue-300"
        }`}
      >
        {isMaxLevel ? `Lv. ${level} / MAX` : `Lv. ${level}`}
      </span>
    </div>
    <p className="text-xs text-gray-400 mb-4 h-8">{desc}</p>
    <button
      onClick={onClick}
      disabled={!canAfford || isMaxLevel}
      className={`w-full py-2 rounded font-bold text-sm flex justify-center items-center gap-1 ${
        isMaxLevel ?
          "bg-amber-600/20 text-amber-200 cursor-not-allowed"
        : canAfford ?
          "bg-green-600 hover:bg-green-500 text-white"
        : "bg-gray-700 text-gray-400 cursor-not-allowed"
      }`}
    >
      {isMaxLevel ? "MAX LEVEL" : `Buy $${cost.toLocaleString()}`}
    </button>
  </div>
);
