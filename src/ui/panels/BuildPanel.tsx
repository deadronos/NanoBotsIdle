import { useGameStore } from "../../state/store";
import { BuildingType } from "../../types/buildings";
import { BUILDING_COSTS, canAffordBuilding } from "../../state/buildingActions";

export function BuildPanel() {
  const world = useGameStore((s) => s.world);
  const selectedBuildingType = useGameStore((s) => s.selectedBuildingType);
  const setSelectedBuildingType = useGameStore((s) => s.setSelectedBuildingType);

  // Get unlock state with fallback to empty unlocks if not initialized
  const unlocks = world.globals?.unlocks || {
    coolers: false,
    powerVeins: false,
    ghostBuilding: false,
    routingPriorities: false,
    diagnosticsTab: false,
    forkProcess: false,
    overclockMode: false,
    selfTermination: false,
    firstDroneFabricated: false,
    firstGhostPlaced: false,
    firstPrioritySet: false,
  };

  // Get inventory of Core
  const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];

  const coreInv = coreId ? world.inventory[Number(coreId)] : null;

  // Filter buildable types based on unlocks
  const allBuildingTypes: BuildingType[] = [
    "Extractor",
    "Assembler",
    "Fabricator",
    "Storage",
  ];

  // Add unlockable buildings
  if (unlocks?.coolers) {
    allBuildingTypes.push("Cooler");
  }
  if (unlocks?.powerVeins) {
    allBuildingTypes.push("PowerVein");
  }
  // CoreCompiler is always available but expensive
  allBuildingTypes.push("CoreCompiler");

  return (
    <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-r-2 border-nano-cyan-600/20 p-6 overflow-y-auto slide-in-left shadow-2xl">
      <h2 className="text-2xl font-extrabold text-transparent bg-gradient-to-r from-nano-cyan-400 to-nano-emerald-400 bg-clip-text mb-6 fade-in">
        Build & Resources
      </h2>

      {/* Core Inventory */}
      {coreInv && (
        <div className="mb-8 fade-in">
          <h3 className="text-sm font-bold text-nano-emerald-400 mb-3 uppercase tracking-wider">Core Inventory</h3>
          <div className="space-y-2 text-sm bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            {Object.entries(coreInv.contents).map(([resource, amount]) => (
              <div key={resource} className="flex justify-between text-slate-200 transition-smooth hover:bg-slate-700/50 px-3 py-2 rounded-md hover:scale-105">
                <span className="font-semibold">{resource}</span>
                <span className="font-mono font-bold text-nano-cyan-400">{Math.floor(amount || 0)}</span>
              </div>
            ))}
            {Object.keys(coreInv.contents).length === 0 && (
              <div className="text-slate-500 italic text-center py-2">Empty</div>
            )}
          </div>
        </div>
      )}

      {/* Building Placement */}
      <div className="mb-8 fade-in">
        <h3 className="text-sm font-bold text-nano-purple-400 mb-3 uppercase tracking-wider">Build Structures</h3>
        <div className="space-y-3">
          {allBuildingTypes.map((type) => {
            const canAfford = canAffordBuilding(world, type);
            const cost = BUILDING_COSTS[type];

            return (
              <button
                key={type}
                onClick={() => setSelectedBuildingType(type === selectedBuildingType ? null : type)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 hover-lift button-press border-2 ${
                  type === selectedBuildingType
                    ? "bg-gradient-to-br from-nano-emerald-600 to-nano-cyan-600 text-white shadow-glow-emerald border-nano-emerald-400 scale-105"
                    : canAfford
                      ? "bg-slate-800/70 hover:bg-slate-700/70 text-white border-slate-600/50 hover:border-nano-cyan-500/50"
                      : "bg-slate-900/50 text-slate-600 cursor-not-allowed border-slate-800/50"
                }`}
                disabled={!canAfford}
              >
                <div className="font-bold text-base mb-1">{type}</div>
                <div className="text-xs text-slate-300 mt-1">
                  Cost:{" "}
                  {Object.entries(cost)
                    .map(([res, amt]) => `${amt} ${res}`)
                    .join(", ")}
                </div>
              </button>
            );
          })}
        </div>
        {selectedBuildingType && (
          <div className="mt-4 text-xs text-nano-emerald-300 bg-nano-emerald-900/30 border-2 border-nano-emerald-500/50 p-3 rounded-lg fade-in pulse-glow shadow-glow-emerald">
            ✓ <span className="font-bold">{selectedBuildingType}</span> selected. Click on the canvas to place.
          </div>
        )}
      </div>

      {/* Production Overview */}
      <div className="mb-6 fade-in">
        <h3 className="text-sm font-bold text-nano-amber-400 mb-3 uppercase tracking-wider">Production</h3>
        <div className="space-y-3 text-sm">
          {Object.entries(world.entityType)
            .filter(([_, type]) => type !== "Core" && type !== "Drone")
            .map(([idStr, type]) => {
              const id = Number(idStr);
              const producer = world.producer[id];
              const inv = world.inventory[id];
              const powerLink = world.powerLink[id];

              // Get heat ratio to show performance impact
              const heatRatio =
                world.globals.heatSafeCap > 0
                  ? world.globals.heatCurrent / world.globals.heatSafeCap
                  : 0;
              const heatPenalty = 1 / (1 + heatRatio);

              // Determine status
              const isOnline = powerLink?.online ?? true;
              const isActive = producer?.active ?? false;
              const isStarved = producer && isOnline && !producer.active;

              // Status indicator color
              const statusColor = !isOnline
                ? "bg-red-500 shadow-glow-red"
                : isStarved
                  ? "bg-orange-500"
                  : isActive
                    ? "bg-nano-emerald-500 shadow-[0_0_10px_rgba(0,230,160,0.5)]"
                    : "bg-slate-500";

              return (
                <div key={id} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 relative overflow-hidden transition-smooth hover:from-slate-700/80 hover:to-slate-800/80 border border-slate-700/50 hover:border-slate-600 shadow-lg">
                  {/* Heat effect overlay */}
                  {producer && heatRatio > 0.5 && (
                    <div
                      className="absolute inset-0 bg-red-500 opacity-5 pointer-events-none transition-opacity duration-500"
                      style={{ opacity: (heatRatio - 0.5) * 0.2 }}
                    />
                  )}

                  <div className="relative">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        {/* Status indicator dot */}
                        <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`} />
                        <span className="font-bold text-white text-base">{type}</span>
                      </div>
                      {producer && (
                        <span className="text-xs text-slate-400 font-semibold bg-slate-700/50 px-2 py-1 rounded-full">
                          T{producer.tier} ({Math.floor(heatPenalty * 100)}%)
                        </span>
                      )}
                    </div>

                    {producer && (
                      <>
                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400 font-medium">
                              {isStarved ? "Starved" : isActive ? "Active" : "Idle"}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                              {Math.floor(producer.progress * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden border border-slate-600">
                            <div
                              className={`h-full transition-all duration-200 ${
                                isStarved
                                  ? "bg-gradient-to-r from-orange-500 to-orange-400"
                                  : isActive
                                    ? "bg-gradient-to-r from-nano-emerald-500 to-nano-cyan-500"
                                    : "bg-slate-600"
                              }`}
                              style={{ width: `${producer.progress * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Recipe info */}
                        <div className="text-xs text-slate-400 mt-2 space-y-0.5">
                          {Object.keys(producer.recipe.inputs).length > 0 && (
                            <div className="font-medium">
                              In:{" "}
                              {Object.entries(producer.recipe.inputs)
                                .map(([res, amt]) => `${amt} ${res}`)
                                .join(", ")}
                            </div>
                          )}
                          {Object.keys(producer.recipe.outputs).length > 0 && (
                            <div className="font-medium">
                              Out:{" "}
                              {Object.entries(producer.recipe.outputs)
                                .map(([res, amt]) => `${amt} ${res}`)
                                .join(", ")}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {inv && Object.keys(inv.contents).length > 0 && (
                      <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700/50">
                        <span className="font-semibold">Storage:</span>{" "}
                        {Object.entries(inv.contents)
                          .filter(([_, amt]) => (amt || 0) > 0)
                          .map(([res, amt]) => `${Math.floor(amt || 0)} ${res}`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-slate-500 bg-slate-800/30 p-4 rounded-lg border border-slate-700/30">
        <p className="mb-2">Click a structure to select it, then click the canvas to place.</p>
        <p className="text-nano-cyan-400">Watch your nanobots swarm and produce resources!</p>
      </div>
    </div>
  );
}
