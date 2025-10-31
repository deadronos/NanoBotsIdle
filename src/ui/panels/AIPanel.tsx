import { useState } from "react";
import { useGameStore } from "../../state/store";

type TabType = "overview" | "priorities" | "diagnostics";

export function AIPanel() {
  const world = useGameStore((s) => s.world);
  const snapshot = useGameStore((s) => s.uiSnapshot);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Get unlock state
  const unlocks = world.globals.unlocks;

  const droneCount = Object.keys(world.droneBrain).length;
  const haulers = Object.values(world.droneBrain).filter((b) => b.role === "hauler").length;
  const builders = Object.values(world.droneBrain).filter((b) => b.role === "builder").length;
  const maintainers = Object.values(world.droneBrain).filter((b) => b.role === "maintainer").length;

  return (
    <div className="w-64 bg-neutral-900 border-l border-neutral-800 flex flex-col slide-in-right">
      <div className="p-4 border-b border-neutral-800 fade-in">
        <h2 className="text-xl font-bold text-white">Swarm Intelligence</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-2 px-3 text-sm font-medium transition-smooth button-press ${
            activeTab === "overview"
              ? "bg-neutral-800 text-white border-b-2 border-emerald-500"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
          }`}
        >
          Overview
        </button>
        {unlocks.routingPriorities && (
          <button
            onClick={() => setActiveTab("priorities")}
            className={`flex-1 py-2 px-3 text-sm font-medium transition-smooth button-press ${
              activeTab === "priorities"
                ? "bg-neutral-800 text-white border-b-2 border-emerald-500"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
            }`}
          >
            Priorities
          </button>
        )}
        {unlocks.diagnosticsTab && (
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex-1 py-2 px-3 text-sm font-medium transition-smooth button-press ${
              activeTab === "diagnostics"
                ? "bg-neutral-800 text-white border-b-2 border-emerald-500"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
            }`}
          >
            Diagnostics
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <>
            {/* Drone Stats */}
            <div className="mb-6 fade-in">
              <h3 className="text-sm font-semibold text-neutral-400 mb-2">Active Drones</h3>
              <div className="space-y-1 text-sm text-neutral-300">
                <div className="flex justify-between transition-smooth hover:bg-neutral-800 px-2 py-1 rounded">
                  <span>Total</span>
                  <span className="font-mono font-bold">{droneCount}</span>
                </div>
                <div className="flex justify-between transition-smooth hover:bg-neutral-800 px-2 py-1 rounded">
                  <span>🔵 Haulers</span>
                  <span className="font-mono">{haulers}</span>
                </div>
                <div className="flex justify-between transition-smooth hover:bg-neutral-800 px-2 py-1 rounded">
                  <span>🟡 Builders</span>
                  <span className="font-mono">{builders}</span>
                </div>
                <div className="flex justify-between transition-smooth hover:bg-neutral-800 px-2 py-1 rounded">
                  <span>🟢 Maintainers</span>
                  <span className="font-mono">{maintainers}</span>
                </div>
              </div>
            </div>

            {/* Task Queue */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-400 mb-2">Task Queue</h3>
              <div className="text-sm text-neutral-300 space-y-1">
                <div className="flex justify-between">
                  <span>Hauling Tasks</span>
                  <span className="font-mono">{world.taskRequests.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance Tasks</span>
                  <span className="font-mono">{world.maintenanceRequests.length}</span>
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
                {Object.entries(world.powerLink).some(([id, link]) => !link.connectedToGrid && world.entityType[Number(id)] !== "Drone") && (
                  <div className="bg-red-900/30 border border-red-800 rounded p-2 text-red-300">
                    ⚠️ Buildings offline: not connected to power grid
                  </div>
                )}
                {snapshot &&
                  snapshot.heatRatio < 0.5 &&
                  droneCount > 0 &&
                  world.taskRequests.length <= 10 &&
                  !Object.values(world.producer).some((p) => !p.active) &&
                  !Object.entries(world.powerLink).some(([id, link]) => !link.connectedToGrid && world.entityType[Number(id)] !== "Drone") && (
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
                  const starvedProducers = Object.entries(world.producer)
                    .filter(([_, p]) => !p.active)
                    .map(([id]) => {
                      const entityId = Number(id);
                      const type = world.entityType[entityId];
                      const pos = world.position[entityId];
                      const link = world.powerLink[entityId];
                      return { id: entityId, type, pos, offline: link && !link.online };
                    });
                  
                  const offlineBuildings = Object.entries(world.powerLink)
                    .filter(([id, link]) => {
                      const entityId = Number(id);
                      return !link.connectedToGrid && world.entityType[entityId] !== "Drone" && world.entityType[entityId] !== "PowerVein";
                    })
                    .map(([id]) => {
                      const entityId = Number(id);
                      const type = world.entityType[entityId];
                      const pos = world.position[entityId];
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
                      {Object.values(world.producer).filter((p) => p.active).length}/
                      {Object.keys(world.producer).length}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{
                        width: `${
                          Object.keys(world.producer).length > 0
                            ? (Object.values(world.producer).filter((p) => p.active).length /
                                Object.keys(world.producer).length) *
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
                      {Object.values(world.droneBrain).filter((b) => b.state !== "idle").length}/
                      {droneCount}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{
                        width: `${
                          droneCount > 0
                            ? (Object.values(world.droneBrain).filter((b) => b.state !== "idle")
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
                {world.taskRequests.length > 10 && droneCount < 5 && (
                  <div className="bg-neutral-800 rounded p-2 text-neutral-300">
                    🔧 Fabricate more drones to handle task backlog
                  </div>
                )}
                {Object.values(world.producer).some((p) => !p.active) && (
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
