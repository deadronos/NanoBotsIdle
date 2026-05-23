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
    className={`bg-slate-900/40 backdrop-blur-md p-4 rounded-xl border transition-all duration-300 select-none ${
      isMaxLevel ?
        "border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)] hover:border-amber-400/45 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
      : canAfford ?
        "border-emerald-500/15 shadow-[0_0_10px_rgba(16,185,129,0.02)] hover:border-emerald-400/35 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]"
      : "border-white/5 hover:border-white/15"
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-extrabold text-white text-base md:text-lg tracking-tight">{title}</h3>
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase ${
          isMaxLevel ? "bg-amber-500/20 text-amber-300 border border-amber-500/35" : (
            "bg-blue-500/20 text-blue-300 border border-blue-500/25"
          )
        }`}
      >
        {isMaxLevel ? `Lv. ${level} / MAX` : `Lv. ${level}`}
      </span>
    </div>
    <p className="text-[11px] text-slate-400 mb-4 h-8 leading-relaxed">{desc}</p>
    <button
      onClick={onClick}
      disabled={!canAfford || isMaxLevel}
      className={`w-full py-2 rounded font-extrabold text-xs tracking-wider uppercase transition-all duration-300 flex justify-center items-center gap-1 active:scale-[0.98] ${
        isMaxLevel ?
          "bg-amber-600/10 text-amber-400/50 border border-amber-500/10 cursor-not-allowed"
        : canAfford ?
          "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)]"
        : "bg-slate-800/80 text-slate-500 border border-slate-700/30 cursor-not-allowed"
      }`}
    >
      {isMaxLevel ? "MAX LEVEL" : `Buy $${cost.toLocaleString()}`}
    </button>
  </div>
);
