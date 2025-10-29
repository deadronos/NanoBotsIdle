import { useGameStore } from "../../state/store";
import { getCompileShardBreakdown } from "../../sim/balance";

interface PrestigeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PrestigeDialog({ isOpen, onClose, onConfirm }: PrestigeDialogProps) {
  const world = useGameStore((s) => s.world);
  const compileYieldMult = useGameStore((s) => s.compilerOptimization.compileYieldMult);
  const scrapBonusShards = useGameStore((s) => s.scrapBonusShards);

  if (!isOpen) return null;

  const { peakThroughput, cohesionScore, stressSecondsAccum } = world.globals;

  // Get shard breakdown using the centralized calculation
  const breakdown = getCompileShardBreakdown({
    peakThroughput,
    cohesionScore,
    stressSecondsAccum,
    yieldMult: compileYieldMult,
  });

  const totalShards = breakdown.finalTotal + scrapBonusShards;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border-2 border-emerald-500 rounded-lg p-8 max-w-2xl w-full mx-4">
        <h2 className="text-3xl font-bold text-emerald-400 mb-6 text-center">
          🔄 RECOMPILE CORE
        </h2>

        <div className="space-y-4 mb-6">
          <p className="text-neutral-300 text-center">
            Recompiling your factory core will reset this run but grant you{" "}
            <span className="text-amber-400 font-bold text-xl">
              {Math.floor(totalShards)} Compile Shards
            </span>
            .
          </p>

          <div className="bg-neutral-800 rounded-lg p-4 space-y-2">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">
              Shard Breakdown:
            </h3>

            <div className="space-y-2 text-sm">
              {/* Throughput Contribution */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">⚡ Peak Throughput</span>
                  <span className="text-neutral-500 text-xs">
                    ({peakThroughput.toFixed(1)} atoms/s)
                  </span>
                </div>
                <span className="text-amber-400 font-semibold">
                  +{breakdown.throughputContribution.toFixed(1)}
                </span>
              </div>

              {/* Cohesion Contribution */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">🔗 Cohesion Score</span>
                  <span className="text-neutral-500 text-xs">
                    ({cohesionScore.toFixed(1)} seconds satisfied)
                  </span>
                </div>
                <span className="text-amber-400 font-semibold">
                  +{breakdown.cohesionContribution.toFixed(1)}
                </span>
              </div>

              {/* Stress Contribution */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">🔥 Stress Time</span>
                  <span className="text-neutral-500 text-xs">
                    ({stressSecondsAccum.toFixed(1)} seconds overclock stress)
                  </span>
                </div>
                <span className="text-amber-400 font-semibold">
                  +{breakdown.stressContribution.toFixed(1)}
                </span>
              </div>

              {/* Base Total */}
              <div className="border-t border-neutral-700 pt-2 mt-2 flex justify-between items-center">
                <span className="text-neutral-400">Base Total</span>
                <span className="text-amber-300 font-semibold">
                  {breakdown.baseTotal.toFixed(1)}
                </span>
              </div>

              {/* Yield Multiplier */}
              {compileYieldMult !== 1.0 && (
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400">✨ Yield Multiplier</span>
                  <span className="text-emerald-400 font-semibold">
                    ×{compileYieldMult.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Scrap Bonus */}
              {scrapBonusShards > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-orange-400">♻️ Scrap Bonus</span>
                  <span className="text-amber-400 font-semibold">
                    +{scrapBonusShards.toFixed(1)}
                  </span>
                </div>
              )}

              {/* Final Total */}
              <div className="border-t-2 border-emerald-500 pt-2 mt-2 flex justify-between items-center">
                <span className="text-lg font-bold text-white">Final Yield</span>
                <span className="text-2xl font-bold text-amber-400">
                  {Math.floor(totalShards)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">
            <strong>⚠️ Warning:</strong> This will reset your current run. All buildings,
            drones, and resources will be lost. Meta upgrades and banked shards will be
            preserved.
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-lg font-semibold bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            Recompile Core
          </button>
        </div>
      </div>
    </div>
  );
}
