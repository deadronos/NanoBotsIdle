import { useGameStore } from "../../state/store";
import { upgradeBuilding, EXTRACTOR_RECIPES, ASSEMBLER_RECIPES } from "../../state/buildingActions";
import { getBuildingUpgradeCost } from "../../sim/balance";
import { useState } from "react";

export function BuildingInfoPanel() {
  const world = useGameStore((s) => s.world);
  const selectedEntity = useGameStore((s) => s.selectedEntity);
  const setSelectedEntity = useGameStore((s) => s.setSelectedEntity);
  const [showRecipeMenu, setShowRecipeMenu] = useState(false);

  if (selectedEntity === null) return null;

  const entityType = world.entityType[selectedEntity];
  const position = world.position[selectedEntity];
  const inventory = world.inventory[selectedEntity];
  const producer = world.producer[selectedEntity];
  const powerLink = world.powerLink[selectedEntity];
  const heatSource = world.heatSource[selectedEntity];
  const heatSink = world.heatSink[selectedEntity];
  const storageHub = world.storageHub[selectedEntity];

  if (!entityType) return null;

  // Handle tier upgrade
  const handleUpgrade = () => {
    if (upgradeBuilding(world, selectedEntity)) {
      // Force a re-render by triggering a state update
      useGameStore.getState().updateUISnapshot();
    }
  };

  // Handle recipe change
  const handleRecipeChange = (recipeKey: string) => {
    if (!producer) return;
    
    const recipes = entityType === "Extractor" ? EXTRACTOR_RECIPES : ASSEMBLER_RECIPES;
    const newRecipe = recipes[recipeKey];
    if (newRecipe) {
      producer.recipe = newRecipe;
      setShowRecipeMenu(false);
      useGameStore.getState().updateUISnapshot();
    }
  };

  // Check if can afford upgrade
  const canAffordUpgrade = producer ? (() => {
    const cost = getBuildingUpgradeCost(producer.tier + 1, entityType);
    const coreId = Object.entries(world.entityType).find(([_, type]) => type === "Core")?.[0];
    if (!coreId) return false;
    const coreInv = world.inventory[Number(coreId)];
    if (!coreInv) return false;
    
    for (const [resource, amount] of Object.entries(cost)) {
      const have = coreInv.contents[resource as keyof typeof coreInv.contents] || 0;
      if (have < Number(amount)) return false;
    }
    return true;
  })() : false;

  // Get upgrade cost for display
  const upgradeCost = producer ? getBuildingUpgradeCost(producer.tier + 1, entityType) : {};

  return (
    <div className="absolute top-4 right-4 bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-lg p-4 w-64 shadow-xl">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white">{entityType}</h3>
        <button
          onClick={() => setSelectedEntity(null)}
          className="text-neutral-400 hover:text-white transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Position */}
      {position && (
        <div className="mb-3">
          <div className="text-xs text-neutral-400">Position</div>
          <div className="text-sm text-neutral-200">
            ({Math.floor(position.x)}, {Math.floor(position.y)})
          </div>
        </div>
      )}

      {/* Producer Info */}
      {producer && (
        <div className="mb-3">
          <div className="text-xs text-neutral-400 mb-1">Production</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-300">Tier</span>
              <span className="font-mono text-white">{producer.tier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-300">Progress</span>
              <span className="font-mono text-white">{Math.floor(producer.progress * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-300">Status</span>
              <span className={producer.active ? "text-green-400" : "text-red-400"}>
                {producer.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-300">Rate</span>
              <span className="font-mono text-white">{producer.baseRate.toFixed(2)}/s</span>
            </div>
          </div>

          {/* Recipe */}
          {producer.recipe && (
            <div className="mt-2 pt-2 border-t border-neutral-700">
              <div className="text-xs text-neutral-400 mb-1 flex justify-between items-center">
                <span>Recipe</span>
                {(entityType === "Extractor" || entityType === "Assembler") && (
                  <button
                    onClick={() => setShowRecipeMenu(!showRecipeMenu)}
                    className="text-xs px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded transition-colors"
                  >
                    Change
                  </button>
                )}
              </div>
              
              {/* Recipe selection menu */}
              {showRecipeMenu && (entityType === "Extractor" || entityType === "Assembler") && (
                <div className="mb-2 p-2 bg-neutral-800 rounded border border-neutral-600">
                  {Object.entries(entityType === "Extractor" ? EXTRACTOR_RECIPES : ASSEMBLER_RECIPES).map(
                    ([key, recipe]) => (
                      <button
                        key={key}
                        onClick={() => handleRecipeChange(key)}
                        className="w-full text-left px-2 py-1 hover:bg-neutral-700 rounded text-xs mb-1"
                      >
                        <div className="text-white">{key}</div>
                        <div className="text-neutral-400">
                          {Object.entries(recipe.outputs)
                            .map(([res, amt]) => `${amt} ${res}`)
                            .join(", ")}
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
              
              <div className="text-xs space-y-1">
                {Object.entries(producer.recipe.inputs).length > 0 && (
                  <div className="text-neutral-300">
                    Input:{" "}
                    {Object.entries(producer.recipe.inputs)
                      .map(([res, amt]) => `${amt} ${res}`)
                      .join(", ")}
                  </div>
                )}
                {Object.entries(producer.recipe.outputs).length > 0 && (
                  <div className="text-emerald-400">
                    Output:{" "}
                    {Object.entries(producer.recipe.outputs)
                      .map(([res, amt]) => `${amt} ${res}`)
                      .join(", ")}
                  </div>
                )}
                <div className="text-neutral-400">Time: {producer.recipe.batchTimeSeconds}s</div>
              </div>
            </div>
          )}
          
          {/* Upgrade button */}
          <div className="mt-2 pt-2 border-t border-neutral-700">
            <button
              onClick={handleUpgrade}
              disabled={!canAffordUpgrade}
              className={`w-full px-3 py-2 rounded text-sm font-semibold transition-colors ${
                canAffordUpgrade
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
              }`}
            >
              Upgrade to Tier {producer.tier + 1}
            </button>
            <div className="mt-1 text-xs text-neutral-400">
              Cost:{" "}
              {Object.entries(upgradeCost)
                .map(([res, amt]) => `${amt} ${res}`)
                .join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* Power Info */}
      {powerLink && (
        <div className="mb-3">
          <div className="text-xs text-neutral-400 mb-1">Power</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-300">Demand</span>
              <span className="font-mono text-white">{powerLink.demand.toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-300">Priority</span>
              <span className="font-mono text-white">{powerLink.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-300">Status</span>
              <span className={powerLink.online ? "text-green-400" : "text-red-400"}>
                {powerLink.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Heat Info */}
      {heatSource && (
        <div className="mb-3">
          <div className="text-xs text-neutral-400 mb-1">Heat Generation</div>
          <div className="text-sm text-orange-400">
            +{heatSource.heatPerSecond.toFixed(1)} heat/s
          </div>
        </div>
      )}

      {heatSink && (
        <div className="mb-3">
          <div className="text-xs text-neutral-400 mb-1">Cooling</div>
          <div className="text-sm text-cyan-400">
            -{heatSink.coolingPerSecond.toFixed(1)} heat/s
          </div>
        </div>
      )}

      {/* Storage Hub Info */}
      {storageHub && (
        <div className="mb-3">
          <div className="text-xs text-neutral-400 mb-1">Storage Benefits</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-300">Radius</span>
              <span className="font-mono text-cyan-400">{storageHub.radius} tiles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-300">Capacity Bonus</span>
              <span className="font-mono text-emerald-400">+{storageHub.capacityBonus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-300">Hauling Boost</span>
              <span className="font-mono text-amber-400">
                +{(storageHub.haulingEfficiencyBonus * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Inventory */}
      {inventory && Object.keys(inventory.contents).length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-neutral-400 mb-1">Inventory</div>
          <div className="space-y-1 text-sm">
            {Object.entries(inventory.contents)
              .filter(([_, amt]) => (amt || 0) > 0)
              .map(([resource, amount]) => (
                <div key={resource} className="flex justify-between">
                  <span className="text-neutral-300">{resource}</span>
                  <span className="font-mono text-white">{Math.floor(amount || 0)}</span>
                </div>
              ))}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Capacity: {inventory.capacity}
          </div>
        </div>
      )}
    </div>
  );
}
