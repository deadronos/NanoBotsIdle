import { useGameStore } from "../../state/store";
import { getCompileShardBreakdown } from "../../sim/balance";
import DraggableModal from "../components/DraggableModal";

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
    <DraggableModal title="Recompile Core" onClose={onClose} maxWidthClass="max-w-md">
      {/* Shard Display - Large and Prominent */}
      <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-2 border-amber-500 rounded-lg p-6 mb-6">
        <div className="text-center">
          <div className="text-neutral-400 text-sm mb-2">You will gain</div>
          <div className="text-6xl font-bold text-amber-400 mb-2">{Math.floor(totalShards)}</div>
          <div className="text-amber-300 text-lg">Compile Shards</div>
        </div>
      </div>

      {/* Simple Breakdown - Compact */}
      <div className="bg-neutral-800 rounded-lg p-4 mb-6 space-y-2 text-sm">
        <div className="flex justify-between text-neutral-300">
          <span>⚡ Throughput</span>
          <span className="text-amber-400">+{breakdown.throughputContribution.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-neutral-300">
          <span>🔗 Cohesion</span>
          <span className="text-amber-400">+{breakdown.cohesionContribution.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-neutral-300">
          <span>🔥 Stress</span>
          <span className="text-amber-400">+{breakdown.stressContribution.toFixed(0)}</span>
        </div>
        {compileYieldMult !== 1.0 && (
          <div className="flex justify-between text-neutral-300 pt-2 border-t border-neutral-700">
            <span>✨ Multiplier</span>
            <span className="text-emerald-400">×{compileYieldMult.toFixed(2)}</span>
          </div>
        )}
        {scrapBonusShards > 0 && (
          <div className="flex justify-between text-neutral-300">
            <span>♻️ Scrap</span>
            <span className="text-orange-400">+{scrapBonusShards.toFixed(0)}</span>
          </div>
        )}
      </div>

      {/* Warning - Compact */}
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6 text-center text-sm text-red-300">
        This will reset your current run
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg font-semibold bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-3 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          Confirm
        </button>
      </div>
    </DraggableModal>
  );
}
