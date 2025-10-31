import { useState } from "react";
import { useGameStore } from "../../state/store";
import type { TaskRequest, MaintenanceRequest } from "../../ecs/world/World";
import type { DroneBrain } from "../../ecs/components/DroneBrain";
import type { Producer } from "../../ecs/components/Producer";
import type { PowerLink } from "../../ecs/components/PowerLink";
import type { Position } from "../../ecs/components/Position";
import { UnlockState, DEFAULT_UNLOCK_STATE } from "../../types/unlocks";

type TabType = "overview" | "priorities" | "diagnostics";

export function AIPanel() {
  const world = useGameStore((s) => s.world);
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Get unlock state
  // Defensive accessors to avoid runtime errors when loading older saves or partial state
  const unlocks: UnlockState = world?.globals?.unlocks ?? DEFAULT_UNLOCK_STATE;

  const droneBrain: Record<number, DroneBrain> = world?.droneBrain ?? {};
  const droneCount = Object.keys(droneBrain).length;
  const haulers = Object.values(droneBrain).filter((b) => b.role === "hauler").length;
  const builders = Object.values(droneBrain).filter((b) => b.role === "builder").length;
  const maintainers = Object.values(droneBrain).filter((b) => b.role === "maintainer").length;

  const taskRequests: TaskRequest[] = world?.taskRequests ?? [];
  const maintenanceRequests: MaintenanceRequest[] = world?.maintenanceRequests ?? [];
  const producer: Record<number, Producer> = world?.producer ?? {};
  const powerLink: Record<number, PowerLink> = world?.powerLink ?? {};
  const entityType: Record<number, string> = world?.entityType ?? {};
  const position: Record<number, Position> = world?.position ?? {};

  return (
    <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-l-2 border-nano-purple-600/20 flex flex-col slide-in-right shadow-2xl">
      <div className="p-6 border-b-2 border-slate-800 fade-in bg-gradient-to-r from-slate-900 to-slate-800">
        <h2 className="text-2xl font-extrabold text-transparent bg-gradient-to-r from-nano-purple-400 to-nano-cyan-400 bg-clip-text">
          Swarm Intelligence
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-slate-800 bg-slate-900/50">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-200 button-press ${
            activeTab === "overview"
              ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white border-b-4 border-nano-emerald-500 shadow-lg"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          Overview
        </button>
        {unlocks.routingPriorities && (
          <button
            onClick={() => setActiveTab("priorities")}
            className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-200 button-press ${
              activeTab === "priorities"
                ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white border-b-4 border-nano-emerald-500 shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Priorities
          </button>
        )}
        {unlocks.diagnosticsTab && (
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-200 button-press ${
              activeTab === "diagnostics"
                ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white border-b-4 border-nano-emerald-500 shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Diagnostics
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && (
          <>
            {/* Drone Stats */}
            <div className="mb-8 fade-in">
              <h3 className="text-sm font-bold text-nano-cyan-400 mb-3 uppercase tracking-wider">Active Drones</h3>
              <div className="space-y-2 text-sm text-slate-200 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex justify-between transition-smooth hover:bg-slate-700/50 px-3 py-2 rounded-md">
                  <span className="font-semibold">Total</span>
                  <span className="font-mono font-extrabold text-nano-cyan-400 text-lg">{droneCount}</span>
                </div>
                <div className="flex justify-between transition-smooth hover:bg-slate-700/50 px-3 py-2 rounded-md items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    🔵 Haulers
                  </span>
                  <span className="font-mono font-bold text-blue-400">{haulers}</span>
                </div>
                <div className="flex justify-between transition-smooth hover:bg-slate-700/50 px-3 py-2 rounded-md items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    🟡 Builders
                  </span>
                  <span className="font-mono font-bold text-yellow-400">{builders}</span>
                </div>
                <div className="flex justify-between transition-smooth hover:bg-slate-700/50 px-3 py-2 rounded-md items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    🟢 Maintainers
                  </span>
                  <span className="font-mono font-bold text-green-400">{maintainers}</span>
                </div>
              </div>
            </div>

            {/* Task Queue */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-nano-purple-400 mb-3 uppercase tracking-wider">Task Queue</h3>
              <div className="text-sm text-slate-200 space-y-2 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex justify-between hover:bg-slate-700/50 px-3 py-2 rounded-md transition-smooth">
                  <span className="font-semibold">Hauling Tasks</span>
                  <span className="font-mono font-bold text-nano-cyan-400">{world.taskRequests.length}</span>
                </div>
                <div className="flex justify-between hover:bg-slate-700/50 px-3 py-2 rounded-md transition-smooth">
                  <span className="font-semibold">Maintenance Tasks</span>
                  <span className="font-mono font-bold text-nano-emerald-400">{world.maintenanceRequests.length}</span>
                </div>
              </div>
            </div>

            {/* Phase Info */}
            {snapshot && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-nano-amber-400 mb-3 uppercase tracking-wider">
                  Phase {snapshot.currentPhase}
                </h3>
                <div className="text-sm text-slate-300 bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-lg p-4 border-2 border-nano-amber-500/30">
                  {snapshot.currentPhase === 1 && (
                    <p className="leading-relaxed">Bootstrap: Build your initial production chain</p>
                  )}
                  {snapshot.currentPhase === 2 && (
                    <p className="leading-relaxed">Networked Logistics: Optimize your swarm's behavior</p>
                  )}
                  {snapshot.currentPhase === 3 && (
                    <p className="leading-relaxed">Overclock: Push to the limit and prepare for recompile</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "priorities" && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-400 mb-3">Routing Priorities</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Configure how drones prioritize different tasks and routes.
            </p>

            <div className="space-y-3">
              <div className="bg-neutral-800 rounded p-3">
                <div className="text-sm text-white mb-2">Hauling Priority</div>
                <div className="flex gap-2">
                  <button className="flex-1 px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded transition-colors">
                    Low
                  </button>
                  <button className="flex-1 px-2 py-1 text-xs bg-emerald-600 rounded">
                    Normal
                  </button>
                  <button className="flex-1 px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded transition-colors">
                    High
                  </button>
                </div>
              </div>

              <div className="bg-neutral-800 rounded p-3">
                <div className="text-sm text-white mb-2">Building Priority</div>
                <div className="flex gap-2">
                  <button className="flex-1 px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded transition-colors">
                    Low
                  </button>
                  <button className="flex-1 px-2 py-1 text-xs bg-emerald-600 rounded">
                    Normal
                  </button>
                  <button className="flex-1 px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded transition-colors">
                    High
                  </button>
                </div>
              </div>

              <div className="bg-neutral-800 rounded p-3">
                <div className="text-sm text-white mb-2">Path Optimization</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-neutral-300">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Avoid congested routes</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-300">
                    <input type="checkbox" className="rounded" />
                    <span>Prefer shortest path</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-neutral-500 bg-neutral-800/50 p-2 rounded">
              💡 Tip: Adjust priorities based on your current bottlenecks.
            </div>
          </div>
        )}

        {activeTab === "diagnostics" && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-400 mb-3">System Diagnostics</h3>

            {/* Active Issues */}
            <div className="mb-4">
              <div className="text-xs text-neutral-500 mb-2">Active Issues</div>
              <div className="space-y-2 text-xs">
                {snapshot && snapshot.heatRatio > 0.7 && (
                  <div className="bg-red-900/30 border border-red-800 rounded p-2 text-red-300">
                    ⚠️ Heat critical: {Math.floor(snapshot.heatRatio * 100)}%
                  </div>
                )}
                {taskRequests.length > 10 && (
                  <div className="bg-yellow-900/30 border border-yellow-800 rounded p-2 text-yellow-300">
                    ⚠️ High task backlog: {taskRequests.length} pending
                  </div>
                )}
                {Object.values(producer).some((p) => !p.active) && (
                  <div className="bg-orange-900/30 border border-orange-800 rounded p-2 text-orange-300">
                    ⚠️ Some producers starved
                  </div>
                )}
                {Object.entries(powerLink).some(([id, link]) => !link.connectedToGrid && entityType[Number(id)] !== "Drone") && (
                  <div className="bg-red-900/30 border border-red-800 rounded p-2 text-red-300">
                    ⚠️ Buildings offline: not connected to power grid
                  </div>
                )}
                {snapshot &&
                  snapshot.heatRatio < 0.5 &&
                  droneCount > 0 &&
                  taskRequests.length <= 10 &&
                  !Object.values(producer).some((p) => !p.active) &&
                  !Object.entries(powerLink).some(([id, link]) => !link.connectedToGrid && entityType[Number(id)] !== "Drone") && (
                    <div className="bg-green-900/30 border border-green-800 rounded p-2 text-green-300">
                      ✓ All systems nominal
                    </div>
                  )}
              </div>
            </div>

            {/* Bottleneck Detection */}
            <div className="mb-4">
              <div className="text-xs text-neutral-500 mb-2">Bottleneck Analysis</div>
              <div className="space-y-2">
                {(() => {
                  const starvedProducers = Object.entries(producer)
                    .filter(([_, p]) => !p.active)
                    .map(([id]) => {
                      const entityId = Number(id);
                      const type = entityType[entityId];
                      const pos = position[entityId];
                      const link = powerLink[entityId];
                      return { id: entityId, type, pos, offline: link && !link.online };
                    });
                  
                  const offlineBuildings = Object.entries(powerLink)
                    .filter(([id, link]) => {
                      const entityId = Number(id);
                      return !link.connectedToGrid && entityType[entityId] !== "Drone" && entityType[entityId] !== "PowerVein";
                    })
                    .map(([id]) => {
                      const entityId = Number(id);
                      const type = entityType[entityId];
                      const pos = position[entityId];
                      return { id: entityId, type, pos };
                    });

                  return (
                    <>
                      {starvedProducers.length > 0 && (
                        <div className="bg-neutral-800 rounded p-2">
                          <div className="text-white font-semibold mb-1">Starved Producers</div>
                          {starvedProducers.slice(0, 3).map(({ id, type, pos, offline }) => (
                            <div key={id} className="text-neutral-300 text-xs">
                              • {type} at ({Math.floor(pos.x)}, {Math.floor(pos.y)})
                              {offline && <span className="text-red-400"> - OFFLINE</span>}
                            </div>
                          ))}
                          {starvedProducers.length > 3 && (
                            <div className="text-neutral-400 text-xs mt-1">
                              ... and {starvedProducers.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                      
                      {offlineBuildings.length > 0 && (
                        <div className="bg-neutral-800 rounded p-2">
                          <div className="text-white font-semibold mb-1">Not Connected to Power Grid</div>
                          {offlineBuildings.slice(0, 3).map(({ id, type, pos }) => (
                            <div key={id} className="text-neutral-300 text-xs">
                              • {type} at ({Math.floor(pos.x)}, {Math.floor(pos.y)})
                            </div>
                          ))}
                          {offlineBuildings.length > 3 && (
                            <div className="text-neutral-400 text-xs mt-1">
                              ... and {offlineBuildings.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                      
                      {starvedProducers.length === 0 && offlineBuildings.length === 0 && (
                        <div className="bg-neutral-800 rounded p-2 text-neutral-400 text-xs">
                          No bottlenecks detected
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mb-4">
              <div className="text-xs text-neutral-500 mb-2">Performance Metrics</div>
              <div className="space-y-2">
                <div className="bg-neutral-800 rounded p-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Production Efficiency</span>
                    <span className="text-white">
                      {Object.values(producer).filter((p) => p.active).length}/
                      {Object.keys(producer).length}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{
                        width: `${
                          Object.keys(producer).length > 0
                            ? (Object.values(producer).filter((p) => p.active).length /
                                Object.keys(producer).length) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-neutral-800 rounded p-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Drone Utilization</span>
                    <span className="text-white">
                      {Object.values(droneBrain).filter((b) => b.state !== "idle").length}/
                      {droneCount}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{
                        width: `${
                          droneCount > 0
                            ? (Object.values(droneBrain).filter((b) => b.state !== "idle")
                                .length /
                                droneCount) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {snapshot && (
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-400">Heat Load</span>
                      <span className="text-white">{Math.floor(snapshot.heatRatio * 100)}%</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          snapshot.heatRatio > 0.8
                            ? "bg-red-500"
                            : snapshot.heatRatio > 0.6
                              ? "bg-orange-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${snapshot.heatRatio * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {snapshot && (
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-400">Power Utilization</span>
                      <span className="text-white">
                        {snapshot.powerAvailable > 0
                          ? Math.floor((snapshot.powerDemand / snapshot.powerAvailable) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${
                            snapshot.powerAvailable > 0
                              ? (snapshot.powerDemand / snapshot.powerAvailable) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <div className="text-xs text-neutral-500 mb-2">Recommendations</div>
              <div className="space-y-2 text-xs">
                {snapshot && snapshot.heatRatio > 0.7 && (
                  <div className="bg-neutral-800 rounded p-2 text-neutral-300">
                    🔧 Consider building more Coolers to manage heat
                  </div>
                )}
                {taskRequests.length > 10 && droneCount < 5 && (
                  <div className="bg-neutral-800 rounded p-2 text-neutral-300">
                    🔧 Fabricate more drones to handle task backlog
                  </div>
                )}
                {Object.values(producer).some((p) => !p.active) && (
                  <div className="bg-neutral-800 rounded p-2 text-neutral-300">
                    🔧 Check resource supply chains for starved producers
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
