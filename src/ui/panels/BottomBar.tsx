import { useGameStore } from "../../state/store";

export function BottomBar() {
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const toggleOverclock = useGameStore((s) => s.toggleOverclock);
  const forkProcess = useGameStore((s) => s.forkProcess);
  const prestigeNow = useGameStore((s) => s.prestigeNow);
  const selfTerminate = useGameStore((s) => s.selfTerminate);
  const compileShards = useGameStore((s) => s.compileShardsBanked);
  const forkPoints = useGameStore((s) => s.forkPoints);
  const world = useGameStore((s) => s.world);

  // Get unlock state
  const unlocks = world.globals.unlocks;

  if (!snapshot) return null;
  
  // Count drones for fork button
  const droneCount = Object.keys(world.droneBrain).length;
  const canFork = unlocks.forkProcess && snapshot.currentPhase >= 2 && droneCount > 0 && snapshot.simTimeSeconds >= 960; // 16 minutes

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
          
          {snapshot.currentPhase >= 2 && (
            <div className="text-sm text-neutral-400">
              Fork Points:{" "}
              <span className="text-lg font-bold text-purple-400">{forkPoints}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Fork Process Button */}
          {canFork && (
            <button
              onClick={forkProcess}
              disabled={droneCount === 0}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                droneCount > 0
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
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
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                snapshot.overclockEnabled
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
              }`}
            >
              {snapshot.overclockEnabled ? "OVERCLOCK ACTIVE" : "ENABLE OVERCLOCK"}
            </button>
          )}

          {/* Self-Termination Button */}
          {unlocks.selfTermination && snapshot.canSelfTerminate && (
            <button
              onClick={selfTerminate}
              className="px-6 py-2 rounded-lg font-semibold bg-red-800 hover:bg-red-900 text-white border-2 border-red-500 transition-colors animate-pulse"
            >
              SELF-TERMINATE ({Math.floor(snapshot.projectedShards)} Shards)
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
