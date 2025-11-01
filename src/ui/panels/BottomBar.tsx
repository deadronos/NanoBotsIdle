import { useCallback } from "react";

import { useGameStore } from "../../state/store";

const buttonBase =
  "rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-slate-500 hover:text-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

export const BottomBar = () => {
  const currentPhase = useGameStore((state) => state.currentPhase);
  const overclockArmed = useGameStore((state) => state.overclockArmed);
  const toggleOverclock = useGameStore((state) => state.toggleOverclock);
  const triggerFork = useGameStore((state) => state.triggerFork);
  const prestigeNow = useGameStore((state) => state.prestigeNow);
  const canFork = useGameStore((state) => state.uiSnapshot.canFork);
  const canPrestige = useGameStore((state) => state.uiSnapshot.canPrestige);

  const handleToggleOverclock = useCallback(() => {
    toggleOverclock(!overclockArmed);
  }, [overclockArmed, toggleOverclock]);

  const handleTriggerFork = useCallback(() => {
    triggerFork();
  }, [triggerFork]);

  const handlePrestige = useCallback(() => {
    prestigeNow();
  }, [prestigeNow]);

  return (
    <footer className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-6 py-3">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-300">
        <span>Phase {currentPhase}</span>
        <span className="text-slate-500">|</span>
        <span>{overclockArmed ? "Overclock Armed" : "Overclock Disarmed"}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`${buttonBase} ${
            overclockArmed ? "border-amber-400 text-amber-300" : ""
          }`}
          onClick={handleToggleOverclock}
        >
          {overclockArmed ? "Disable Overclock" : "Enable Overclock"}
        </button>
        <button
          type="button"
          className={buttonBase}
          onClick={handleTriggerFork}
          disabled={!canFork}
        >
          Trigger Fork
        </button>
        <button
          type="button"
          className={`${buttonBase} border-emerald-500 text-emerald-300`}
          onClick={handlePrestige}
          disabled={!canPrestige}
        >
          Recompile Core
        </button>
      </div>
    </footer>
  );
};
