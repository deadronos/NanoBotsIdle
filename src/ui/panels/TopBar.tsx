import { useGameStore } from "../../state/store";

export function TopBar() {
  const snapshot = useGameStore((s) => s.uiSnapshot);

  if (!snapshot) return null;

  const heatPercent = Math.floor(snapshot.heatRatio * 100);
  const heatColor = 
    heatPercent > 80 ? "text-red-400" : 
    heatPercent > 50 ? "text-orange-400" : 
    "text-green-400";

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-3">
      <div className="flex items-center justify-between gap-8">
        <div className="text-2xl font-bold text-emerald-400">
          NanoFactory Evolution
        </div>

        <div className="flex items-center gap-6">
          {/* Heat */}
          <div className="flex flex-col">
            <div className="text-xs text-neutral-400">Heat</div>
            <div className={`text-lg font-semibold ${heatColor}`}>
              {Math.floor(snapshot.heatCurrent)} / {snapshot.heatSafeCap}
              <span className="text-sm ml-1">({heatPercent}%)</span>
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
              {Math.floor(snapshot.simTimeSeconds / 60)}m {Math.floor(snapshot.simTimeSeconds % 60)}s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
