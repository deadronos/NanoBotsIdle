import { useGameStore } from "../../state/store";

export function BottomBar() {
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const toggleOverclock = useGameStore((s) => s.toggleOverclock);
  const prestigeNow = useGameStore((s) => s.prestigeNow);
  const compileShards = useGameStore((s) => s.compileShardsBanked);
  const world = useGameStore((s) => s.world);

  // Get unlock state
  const unlocks = world.globals.unlocks;

  if (!snapshot) return null;

  return (
    <div className="bg-neutral-900 border-t border-neutral-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-neutral-400">
            Phase <span className="text-xl font-bold text-white">{snapshot.currentPhase}</span>
          </div>

          <div className="text-sm text-neutral-400">
            Banked Shards:{" "}
            <span className="text-lg font-bold text-amber-400">{Math.floor(compileShards)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Overclock Toggle */}
          {unlocks.overclockMode && snapshot.currentPhase >= 2 && (
            <button
              onClick={() => toggleOverclock(!snapshot.overclockEnabled)}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                snapshot.overclockEnabled
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
              }`}
            >
              {snapshot.overclockEnabled ? "OVERCLOCK ACTIVE" : "ENABLE OVERCLOCK"}
            </button>
          )}

          {/* Prestige Button */}
          <button
            onClick={prestigeNow}
            disabled={!snapshot.canPrestige && snapshot.projectedShards < 1}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              snapshot.canPrestige || snapshot.projectedShards >= 1
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            }`}
          >
            RECOMPILE CORE ({Math.floor(snapshot.projectedShards)} Shards)
          </button>
        </div>
      </div>
    </div>
  );
}
