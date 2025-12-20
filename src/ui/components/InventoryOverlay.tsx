import { INVENTORY_BLOCKS, tileForBlockIcon } from "../../game/items";
import { type Recipe, RECIPES } from "../../game/recipes";
import { type BlockId, blockIdToName } from "../../voxel/World";
import { iconStyle } from "../utils";

type InventoryOverlayProps = {
  atlasUrl?: string;
  inventory: Record<number, number>;
  selectedSlot: number;
  onAssignSlot: (slot: number, id: BlockId) => void;
  onCraft: (recipe: Recipe) => void;
  onClose: () => void;
};

export default function InventoryOverlay({
  atlasUrl,
  inventory,
  selectedSlot,
  onAssignSlot,
  onCraft,
  onClose,
}: InventoryOverlayProps) {
  return (
    <div className="overlay">
      <div className="panel inventory">
        <div className="panel-header">
          <div>
            <div className="title">Inventory</div>
            <div className="subtitle">Click an item to assign it to the selected hotbar slot.</div>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="inventory-grid">
          {INVENTORY_BLOCKS.map((id) => {
            const count = inventory[id] ?? 0;
            const disabled = count <= 0;
            return (
              <button
                key={id}
                type="button"
                className="inventory-slot"
                disabled={disabled}
                onClick={() => onAssignSlot(selectedSlot, id)}
                title={blockIdToName(id)}
              >
                <div className="item-icon" style={iconStyle(tileForBlockIcon(id), atlasUrl)} />
                <div className="slot-count">{count}</div>
              </button>
            );
          })}
        </div>

        <div className="crafting">
          <div className="title">Crafting Bench</div>
          <div className="subtitle">Batch recipes to shape your next build.</div>

          <div className="recipes">
            {RECIPES.map((recipe) => {
              const canCraft = recipe.input.every(
                (input) => (inventory[input.id] ?? 0) >= input.count,
              );
              return (
                <div key={recipe.id} className={`recipe-card ${canCraft ? "ready" : ""}`}>
                  <div className="recipe-name">{recipe.name}</div>
                  <div className="recipe-row">
                    {recipe.input.map((input) => (
                      <div key={`${recipe.id}-${input.id}`} className="recipe-item">
                        <div
                          className="item-icon"
                          style={iconStyle(tileForBlockIcon(input.id), atlasUrl)}
                        />
                        <div className="slot-count">{input.count}</div>
                      </div>
                    ))}
                    <div className="recipe-arrow">-&gt;</div>
                    <div className="recipe-item">
                      <div
                        className="item-icon"
                        style={iconStyle(tileForBlockIcon(recipe.output.id), atlasUrl)}
                      />
                      <div className="slot-count">{recipe.output.count}</div>
                    </div>
                  </div>
                  <button className="action" disabled={!canCraft} onClick={() => onCraft(recipe)}>
                    Craft
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
