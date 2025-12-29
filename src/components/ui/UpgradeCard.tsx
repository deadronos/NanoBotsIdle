import React from "react";

export const UpgradeCard: React.FC<{
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
        canAfford ? "bg-green-600 hover:bg-green-500 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
      }`}
    >
      Buy ${cost.toLocaleString()}
    </button>
  </div>
);

