import React from "react";

export const Hud: React.FC<{
  credits: number;
  prestigeLevel: number;
  className?: string;
}> = ({ credits, prestigeLevel, className = "" }) => {
  return (
    <div className={`flex gap-4 pointer-events-auto select-none ${className}`}>
      {/* Credits Card */}
      <div className="group bg-slate-900/65 backdrop-blur-md px-6 py-2.5 rounded-full border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.06)] hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:border-yellow-400/40 transition-all duration-300 flex flex-col items-center cursor-default">
        <span className="text-yellow-400 font-extrabold text-xl md:text-2xl tracking-wider drop-shadow-[0_0_8px_rgba(234,179,8,0.3)] group-hover:scale-105 transition-transform duration-300">
          ${credits.toLocaleString()}
        </span>
        <span className="text-[10px] text-yellow-200/50 uppercase font-bold tracking-widest mt-0.5">
          Credits
        </span>
      </div>

      {/* Prestige Card */}
      <div className="group bg-slate-900/65 backdrop-blur-md px-6 py-2.5 rounded-full border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.06)] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:border-purple-400/40 transition-all duration-300 flex flex-col items-center cursor-default">
        <span className="text-purple-400 font-extrabold text-xl md:text-2xl tracking-wider drop-shadow-[0_0_8px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform duration-300">
          Lv. {prestigeLevel}
        </span>
        <span className="text-[10px] text-purple-200/50 uppercase font-bold tracking-widest mt-0.5">
          Prestige
        </span>
      </div>
    </div>
  );
};
