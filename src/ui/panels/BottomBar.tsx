import { useState } from "react";
import { useGameStore } from "../../state/store";
import { PrestigeDialog } from "./PrestigeDialog";
import { MetaUpgradesPanel } from "./MetaUpgradesPanel";
import { ForkModulesPanel } from "./ForkModulesPanel";

export function BottomBar() {
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const toggleOverclock = useGameStore((s) => s.toggleOverclock);
  const forkProcess = useGameStore((s) => s.forkProcess);
  const prestigeNow = useGameStore((s) => s.prestigeNow);
  const selfTerminate = useGameStore((s) => s.selfTerminate);
  const compileShards = useGameStore((s) => s.compileShardsBanked);
  const forkPoints = useGameStore((s) => s.forkPoints);
  const world = useGameStore((s) => s.world);
  const [showMetaUpgrades, setShowMetaUpgrades] = useState(false);
  const [showForkModules, setShowForkModules] = useState(false);

  const [showPrestigeDialog, setShowPrestigeDialog] = useState(false);

  // Get unlock state
  const unlocks = world.globals.unlocks;

  if (!snapshot) return null;
  
  // Count drones for fork button
  const droneCount = Object.keys(world.droneBrain).length;
  const canFork = unlocks.forkProcess && snapshot.currentPhase >= 2 && droneCount > 0 && snapshot.simTimeSeconds >= 960; // 16 minutes

  const handlePrestigeClick = () => {
    setShowPrestigeDialog(true);
  };

  const handlePrestigeConfirm = () => {
    setShowPrestigeDialog(false);
    prestigeNow();
  };

  const handlePrestigeCancel = () => {
    setShowPrestigeDialog(false);
  };

  return (
    <>
      <PrestigeDialog
        isOpen={showPrestigeDialog}
        onClose={handlePrestigeCancel}
        onConfirm={handlePrestigeConfirm}
      />
      {showMetaUpgrades && <MetaUpgradesPanel onClose={() => setShowMetaUpgrades(false)} />}
      {showForkModules && <ForkModulesPanel onClose={() => setShowForkModules(false)} />}
      
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-2 border-nano-purple-600/30 px-8 py-5 fade-in shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-sm text-slate-400 transition-smooth bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
            <span className="font-semibold uppercase tracking-wider">Phase</span>{" "}
            <span className="text-2xl font-extrabold text-nano-cyan-400">{snapshot.currentPhase}</span>
          </div>

          <div className="text-sm text-slate-400 transition-smooth bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
            <span className="font-semibold uppercase tracking-wider">Banked Shards:</span>{" "}
            <span className="text-2xl font-extrabold text-nano-amber-400">{Math.floor(compileShards)}</span>
          </div>
          
          {snapshot.currentPhase >= 2 && (
            <div className="text-sm text-slate-400 transition-smooth fade-in bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
              <span className="font-semibold uppercase tracking-wider">Fork Points:</span>{" "}
              <span className="text-2xl font-extrabold text-nano-purple-400">{forkPoints}</span>
            </div>
          )}
          
          {/* Meta Upgrades Button */}
          {compileShards >= 1 && (
            <button
              onClick={() => setShowMetaUpgrades(true)}
              className="px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-r from-nano-amber-600 to-nano-amber-500 hover:from-nano-amber-500 hover:to-nano-amber-400 text-white transition-all duration-200 hover-lift button-press border-2 border-nano-amber-400 fade-in shadow-glow-amber"
              title="View and purchase meta upgrades"
            >
              📊 META UPGRADES
            </button>
          )}
          
          {/* Fork Modules Button */}
          {forkPoints >= 1 && snapshot.currentPhase >= 2 && (
            <button
              onClick={() => setShowForkModules(true)}
              className="px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-r from-nano-purple-600 to-nano-purple-500 hover:from-nano-purple-500 hover:to-nano-purple-400 text-white transition-all duration-200 hover-lift button-press border-2 border-nano-purple-400 fade-in shadow-glow-purple"
              title="View and purchase fork behavior modules"
            >
              🧬 FORK MODULES
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Fork Process Button */}
          {canFork && (
            <button
              onClick={forkProcess}
              disabled={droneCount === 0}
              className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-200 hover-lift button-press fade-in shadow-lg ${
                droneCount > 0
                  ? "bg-gradient-to-r from-nano-purple-600 to-nano-purple-500 hover:from-nano-purple-500 hover:to-nano-purple-400 text-white border-2 border-nano-purple-400 shadow-glow-purple"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed border-2 border-slate-600"
              }`}
              title={`Sacrifice all ${droneCount} drones to evolve swarm behaviors. Earn ${Math.max(1, Math.floor(droneCount / 3))} fork point(s).`}
            >
              FORK PROCESS ({droneCount} drones)
            </button>
          )}
          
          {/* Overclock Toggle */}
          {unlocks.overclockMode && snapshot.currentPhase >= 2 && (
            <button
              onClick={() => toggleOverclock(!snapshot.overclockEnabled)}
              className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-200 hover-lift button-press fade-in shadow-lg border-2 ${
                snapshot.overclockEnabled
                  ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white pulse-glow border-red-400"
                  : "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-orange-400"
              }`}
            >
              {snapshot.overclockEnabled ? "🔥 OVERCLOCK ACTIVE" : "⚡ ENABLE OVERCLOCK"}
            </button>
          )}

          {/* Self-Termination Button */}
          {unlocks.selfTermination && snapshot.canSelfTerminate && (
            <button
              onClick={selfTerminate}
              className="px-8 py-3 rounded-xl font-bold text-base bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white border-2 border-red-500 transition-all duration-200 hover-lift button-press animate-pulse fade-in shadow-lg"
            >
              ☠️ SELF-TERMINATE ({Math.floor(snapshot.projectedShards)} Shards)
            </button>
          )}

          {/* Prestige Button */}
          <button
            onClick={handlePrestigeClick}
            disabled={!snapshot.canPrestige && snapshot.projectedShards < 1}
            className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-200 hover-lift button-press shadow-lg border-2 ${
              snapshot.canPrestige || snapshot.projectedShards >= 1
                ? "bg-gradient-to-r from-nano-emerald-600 to-nano-emerald-500 hover:from-nano-emerald-500 hover:to-nano-emerald-400 text-white border-nano-emerald-400 shadow-glow-emerald"
                : "bg-slate-700 text-slate-500 cursor-not-allowed border-slate-600"
            }`}
          >
            🔄 RECOMPILE CORE ({Math.floor(snapshot.projectedShards)} Shards)
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
