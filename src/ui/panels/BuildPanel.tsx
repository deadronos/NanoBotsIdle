import { useGameStore } from "../../state/store";
import { BuildingType } from "../../types/buildings";
import { BUILDING_COSTS, canAffordBuilding } from "../../state/buildingActions";

export function BuildPanel() {
  const world = useGameStore((s) => s.world);
  const selectedBuildingType = useGameStore((s) => s.selectedBuildingType);
  const setSelectedBuildingType = useGameStore((s) => s.setSelectedBuildingType);

  // Get unlock state
  const unlocks = world.globals.unlocks;

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
  if (unlocks.coolers) {
    allBuildingTypes.push("Cooler");
  }
  if (unlocks.powerVeins) {
    allBuildingTypes.push("PowerVein");
  }
  // CoreCompiler is always available but expensive
  allBuildingTypes.push("CoreCompiler");

  return (
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-4">Build & Resources</h2>

      {/* Core Inventory */}
      {coreInv && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-neutral-400 mb-2">Core Inventory</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(coreInv.contents).map(([resource, amount]) => (
              <div key={resource} className="flex justify-between text-neutral-300">
                <span>{resource}</span>
                <span className="font-mono">{Math.floor(amount || 0)}</span>
              </div>
            ))}
            {Object.keys(coreInv.contents).length === 0 && (
              <div className="text-neutral-500 italic">Empty</div>
            )}
          </div>
        </div>
      )}

      {/* Building Placement */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Build Structures</h3>
        <div className="space-y-2">
          {allBuildingTypes.map((type) => {
            const canAfford = canAffordBuilding(world, type);
            const cost = BUILDING_COSTS[type];

            return (
              <button
                key={type}
                onClick={() => setSelectedBuildingType(type === selectedBuildingType ? null : type)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  type === selectedBuildingType
                    ? "bg-emerald-600 text-white"
                    : canAfford
                      ? "bg-neutral-800 hover:bg-neutral-700 text-white"
                      : "bg-neutral-800/50 text-neutral-600 cursor-not-allowed"
                }`}
                disabled={!canAfford}
              >
                <div className="font-semibold text-sm">{type}</div>
                <div className="text-xs text-neutral-400 mt-1">
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
          <div className="mt-2 text-xs text-emerald-400 bg-emerald-900/30 p-2 rounded">
            ✓ {selectedBuildingType} selected. Click on the canvas to place.
          </div>
        )}
      </div>

      {/* Production Overview */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Production</h3>
        <div className="space-y-2 text-sm">
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
                ? "bg-red-500"
                : isStarved
                  ? "bg-orange-500"
                  : isActive
                    ? "bg-green-500"
                    : "bg-neutral-500";

              return (
                <div key={id} className="bg-neutral-800 rounded p-2 relative overflow-hidden">
                  {/* Heat effect overlay */}
                  {producer && heatRatio > 0.5 && (
                    <div
                      className="absolute inset-0 bg-red-500 opacity-5 pointer-events-none"
                      style={{ opacity: (heatRatio - 0.5) * 0.2 }}
                    />
                  )}

                  <div className="relative">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        {/* Status indicator dot */}
                        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                        <span className="font-semibold text-white">{type}</span>
                      </div>
                      {producer && (
                        <span className="text-xs text-neutral-400">
                          T{producer.tier} ({Math.floor(heatPenalty * 100)}%)
                        </span>
                      )}
                    </div>

                    {producer && (
                      <>
                        {/* Progress bar */}
                        <div className="mb-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-xs text-neutral-400">
                              {isStarved ? "Starved" : isActive ? "Active" : "Idle"}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {Math.floor(producer.progress * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-200 ${
                                isStarved
                                  ? "bg-orange-400"
                                  : isActive
                                    ? "bg-emerald-500"
                                    : "bg-neutral-600"
                              }`}
                              style={{ width: `${producer.progress * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Recipe info */}
                        <div className="text-xs text-neutral-500 mt-1">
                          {Object.keys(producer.recipe.inputs).length > 0 && (
                            <div>
                              In:{" "}
                              {Object.entries(producer.recipe.inputs)
                                .map(([res, amt]) => `${amt} ${res}`)
                                .join(", ")}
                            </div>
                          )}
                          {Object.keys(producer.recipe.outputs).length > 0 && (
                            <div>
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
                      <div className="text-xs text-neutral-500 mt-1 pt-1 border-t border-neutral-700">
                        Storage:{" "}
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
      <div className="text-xs text-neutral-500">
        <p>Click a structure to select it, then click the canvas to place.</p>
        <p className="mt-2">Watch your nanobots swarm and produce resources!</p>
      </div>
    </div>
  );
}
