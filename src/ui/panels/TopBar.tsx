import { useGameStore } from "../../state/store";
import { hasSave } from "../../state/persistence";

export function TopBar() {
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const saveGame = useGameStore((s) => s.saveGame);
  const loadGame = useGameStore((s) => s.loadGame);

  if (!snapshot) return null;

  const heatPercent = Math.floor(snapshot.heatRatio * 100);
  const heatColor =
    heatPercent > 80 ? "text-red-400" : heatPercent > 50 ? "text-orange-400" : "text-green-400";
  const heatBgColor =
    heatPercent > 80
      ? "bg-red-900/30"
      : heatPercent > 50
        ? "bg-orange-900/30"
        : "bg-green-900/30";

  // Heat impact on production
  const heatPenalty = Math.floor((1 / (1 + snapshot.heatRatio)) * 100);

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-3">
      <div className="flex items-center justify-between gap-8">
        <div className="text-2xl font-bold text-emerald-400">NanoFactory Evolution</div>

        <div className="flex items-center gap-6">
          {/* Heat */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Heat</div>
            <div className={`text-lg font-semibold ${heatColor}`}>
              {Math.floor(snapshot.heatCurrent)} / {snapshot.heatSafeCap}
              <span className="text-sm ml-1">({heatPercent}%)</span>
            </div>
            {/* Heat efficiency indicator */}
            <div className={`text-xs ${heatColor} ${heatBgColor} px-1 rounded mt-0.5`}>
              Efficiency: {heatPenalty}%
            </div>
          </div>

          {/* Power */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Power</div>
            <div className="text-lg font-semibold text-blue-400">
              {Math.floor(snapshot.powerDemand)} / {snapshot.powerAvailable}
            </div>
          </div>

          {/* Throughput */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Throughput</div>
            <div className="text-lg font-semibold text-purple-400">
              {snapshot.throughput.toFixed(1)} <span className="text-sm">atoms/s</span>
            </div>
          </div>

          {/* Projected Shards */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Projected Shards</div>
            <div className="text-lg font-semibold text-amber-400">
              {Math.floor(snapshot.projectedShards)}
            </div>
          </div>

          {/* Time */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Time</div>
            <div className="text-lg font-semibold text-neutral-300">
              {Math.floor(snapshot.simTimeSeconds / 60)}m {Math.floor(snapshot.simTimeSeconds % 60)}
              s
            </div>
          </div>
        </div>

        {/* Save/Load Buttons */}
        <div className="flex gap-2">
          <button
            onClick={saveGame}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="Manual Save"
          >
            💾 Save
          </button>
          {hasSave() && (
            <button
              onClick={loadGame}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              title="Load Save"
            >
              📂 Load
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
