import { useGameStore } from "../../state/store";
import DraggableModal from "../components/DraggableModal";

export function BuildingInfoPanel() {
  const world = useGameStore((s) => s.world);
  const selectedEntity = useGameStore((s) => s.selectedEntity);
  const setSelectedEntity = useGameStore((s) => s.setSelectedEntity);

  if (selectedEntity === null) return null;

  const entityType = world.entityType[selectedEntity];
  const position = world.position[selectedEntity];
  const inventory = world.inventory[selectedEntity];
  const producer = world.producer[selectedEntity];
  const powerLink = world.powerLink[selectedEntity];
  const heatSource = world.heatSource[selectedEntity];
  const heatSink = world.heatSink[selectedEntity];

  if (!entityType) return null;

  return (
    <DraggableModal onClose={() => setSelectedEntity(null)} maxWidthClass="max-w-sm" maxHeightClass="max-h-[70vh]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white">{entityType}</h3>
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
              <div className="text-xs text-neutral-400 mb-1">Recipe</div>
              <div className="text-xs space-y-1">
                {Object.entries(producer.recipe.inputs).length > 0 && (
                  <div className="text-neutral-300">
                    Input: {" "}
                    {Object.entries(producer.recipe.inputs)
                      .map(([res, amt]) => `${amt} ${res}`)
                      .join(", ")}
                  </div>
                )}
                {Object.entries(producer.recipe.outputs).length > 0 && (
                  <div className="text-emerald-400">
                    Output: {" "}
                    {Object.entries(producer.recipe.outputs)
                      .map(([res, amt]) => `${amt} ${res}`)
                      .join(", ")}
                  </div>
                )}
                <div className="text-neutral-400">Time: {producer.recipe.batchTimeSeconds}s</div>
              </div>
            </div>
          )}
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
    </DraggableModal>
  );
}
