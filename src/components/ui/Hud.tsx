import React from "react";

export const Hud: React.FC<{ credits: number; prestigeLevel: number }> = ({
  credits,
  prestigeLevel,
}) => {
  return (
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
  );
};
