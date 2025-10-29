import { useGameStore } from "../../state/store";

export function AIPanel() {
  const world = useGameStore((s) => s.world);
  const snapshot = useGameStore((s) => s.uiSnapshot);

  const droneCount = Object.keys(world.droneBrain).length;
  const haulers = Object.values(world.droneBrain).filter(
    (b) => b.role === "hauler"
  ).length;
  const builders = Object.values(world.droneBrain).filter(
    (b) => b.role === "builder"
  ).length;

  return (
    <div className="w-64 bg-neutral-900 border-l border-neutral-800 p-4 overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-4">Swarm Intelligence</h2>

      {/* Drone Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Active Drones</h3>
        <div className="space-y-1 text-sm text-neutral-300">
          <div className="flex justify-between">
            <span>Total</span>
            <span className="font-mono font-bold">{droneCount}</span>
          </div>
          <div className="flex justify-between">
            <span>🔵 Haulers</span>
            <span className="font-mono">{haulers}</span>
          </div>
          <div className="flex justify-between">
            <span>🟡 Builders</span>
            <span className="font-mono">{builders}</span>
          </div>
        </div>
      </div>

      {/* Task Queue */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Task Queue</h3>
        <div className="text-sm text-neutral-300">
          <div className="flex justify-between">
            <span>Pending Tasks</span>
            <span className="font-mono">{world.taskRequests.length}</span>
          </div>
        </div>
      </div>

      {/* Phase Info */}
      {snapshot && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-neutral-400 mb-2">
            Phase {snapshot.currentPhase}
          </h3>
          <div className="text-xs text-neutral-500">
            {snapshot.currentPhase === 1 && (
              <p>Bootstrap: Build your initial production chain</p>
            )}
            {snapshot.currentPhase === 2 && (
              <p>Networked Logistics: Optimize your swarm's behavior</p>
            )}
            {snapshot.currentPhase === 3 && (
              <p>Overclock: Push to the limit and prepare for recompile</p>
            )}
          </div>
        </div>
      )}

      {/* Diagnostics */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Diagnostics</h3>
        <div className="space-y-2 text-xs">
          {snapshot && snapshot.heatRatio > 0.7 && (
            <div className="bg-red-900/30 border border-red-800 rounded p-2 text-red-300">
              ⚠️ Heat critical: {Math.floor(snapshot.heatRatio * 100)}%
            </div>
          )}
          {world.taskRequests.length > 10 && (
            <div className="bg-yellow-900/30 border border-yellow-800 rounded p-2 text-yellow-300">
              ⚠️ High task backlog: {world.taskRequests.length} pending
            </div>
          )}
          {Object.values(world.producer).some((p) => !p.active) && (
            <div className="bg-orange-900/30 border border-orange-800 rounded p-2 text-orange-300">
              ⚠️ Some producers starved
            </div>
          )}
          {snapshot && snapshot.heatRatio < 0.5 && droneCount > 0 && (
            <div className="bg-green-900/30 border border-green-800 rounded p-2 text-green-300">
              ✓ Systems nominal
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
