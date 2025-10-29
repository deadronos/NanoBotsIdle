import { useGameStore } from "../../state/store";
import { BuildingType } from "../../types/buildings";
import { BUILDING_COSTS, canAffordBuilding } from "../../state/buildingActions";

export function BuildPanel() {
  const world = useGameStore((s) => s.world);
  const selectedBuildingType = useGameStore((s) => s.selectedBuildingType);
  const setSelectedBuildingType = useGameStore((s) => s.setSelectedBuildingType);

  // Get inventory of Core
  const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];

  const coreInv = coreId ? world.inventory[Number(coreId)] : null;

  const buildableTypes: BuildingType[] = [
    "Extractor",
    "Assembler",
    "Fabricator",
    "Cooler",
    "Storage",
  ];

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
          {buildableTypes.map((type) => {
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

              return (
                <div key={id} className="bg-neutral-800 rounded p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{type}</span>
                    {producer && <span className="text-xs text-neutral-400">T{producer.tier}</span>}
                  </div>
                  {producer && (
                    <div className="text-xs text-neutral-400">
                      Progress: {Math.floor(producer.progress * 100)}%
                    </div>
                  )}
                  {inv && Object.keys(inv.contents).length > 0 && (
                    <div className="text-xs text-neutral-500 mt-1">
                      {Object.entries(inv.contents)
                        .filter(([_, amt]) => (amt || 0) > 0)
                        .map(([res, amt]) => `${res}: ${Math.floor(amt || 0)}`)
                        .join(", ")}
                    </div>
                  )}
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
