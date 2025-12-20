import { useEffect, useMemo } from "react";
import GameCanvas from "./game/GameCanvas";
import { INVENTORY_BLOCKS, tileForBlockIcon } from "./game/items";
import { RECIPES } from "./game/recipes";
import { useGameStore } from "./game/store";
import { blockIdToName } from "./voxel/World";

const tilesPerRow = 16;
const tilePx = 16;
const atlasPx = tilesPerRow * tilePx;

function iconStyle(tile: number, atlasUrl?: string) {
  if (!atlasUrl) return undefined;
  const x = (tile % tilesPerRow) * tilePx;
  const y = Math.floor(tile / tilesPerRow) * tilePx;
  return {
    backgroundImage: `url(${atlasUrl})`,
    backgroundPosition: `-${x}px -${y}px`,
    backgroundSize: `${atlasPx}px ${atlasPx}px`
  } as const;
}

function timeLabel(t: number) {
  if (t < 0.22) return "Dawn";
  if (t < 0.5) return "Noon";
  if (t < 0.72) return "Dusk";
  return "Night";
}

export default function App() {
  const pointerLocked = useGameStore((state) => state.pointerLocked);
  const requestPointerLock = useGameStore((state) => state.requestPointerLock);
  const atlasUrl = useGameStore((state) => state.atlasUrl);
  const uiOpen = useGameStore((state) => state.uiOpen);
  const setUiOpen = useGameStore((state) => state.setUiOpen);
  const hotbar = useGameStore((state) => state.hotbar);
  const selectedSlot = useGameStore((state) => state.selectedSlot);
  const setSelectedSlot = useGameStore((state) => state.setSelectedSlot);
  const setHotbarSlot = useGameStore((state) => state.setHotbarSlot);
  const inventory = useGameStore((state) => state.inventory);
  const craft = useGameStore((state) => state.craft);
  const stats = useGameStore((state) => state.stats);
  const targetBlock = useGameStore((state) => state.targetBlock);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code.startsWith("Digit")) {
        const idx = Number(e.code.slice(5)) - 1;
        if (!Number.isNaN(idx)) setSelectedSlot(idx);
      }
      if (e.code === "KeyE") {
        const next = !useGameStore.getState().uiOpen;
        setUiOpen(next);
        if (next) {
          document.exitPointerLock();
        } else {
          requestPointerLock?.();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestPointerLock, setSelectedSlot, setUiOpen]);

  const hotbarSlots = useMemo(() => hotbar.map((id) => ({
    id,
    tile: tileForBlockIcon(id)
  })), [hotbar]);

  return (
    <div className="app">
      <GameCanvas />

      <div className="hud">
        <div className="panel top-left">
          <div className="title">Voxel Frontier</div>
          <div className="subtitle">Nanobots Idle - single-player survival sandbox</div>
          <div className="stats-grid">
            <div>FPS</div>
            <div>{stats.fps}</div>
            <div>Pos</div>
            <div>
              {stats.position.x.toFixed(1)}, {stats.position.y.toFixed(1)}, {stats.position.z.toFixed(1)}
            </div>
            <div>Chunks</div>
            <div>{stats.chunkCount}</div>
            <div>Time</div>
            <div>{timeLabel(stats.timeOfDay)}</div>
            <div>Target</div>
            <div>{targetBlock != null ? blockIdToName(targetBlock) : "None"}</div>
          </div>
        </div>

        <div className={`crosshair ${pointerLocked ? "locked" : ""}`} />

        <div className="hotbar">
          {hotbarSlots.map((slot, idx) => {
            const count = inventory[slot.id] ?? 0;
            return (
              <div
                key={`${slot.id}-${idx}`}
                className={`slot ${idx === selectedSlot ? "selected" : ""}`}
              >
                <div className="slot-index">{idx + 1}</div>
                <div className="item-icon" style={iconStyle(slot.tile, atlasUrl)} />
                <div className="slot-count">{count}</div>
              </div>
            );
          })}
        </div>

        {uiOpen && (
          <div className="overlay">
            <div className="panel inventory">
              <div className="panel-header">
                <div>
                  <div className="title">Inventory</div>
                  <div className="subtitle">Click an item to assign it to the selected hotbar slot.</div>
                </div>
                <button
                  className="ghost"
                  onClick={() => {
                    setUiOpen(false);
                    requestPointerLock?.();
                  }}
                >
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
                      onClick={() => setHotbarSlot(selectedSlot, id)}
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
                    const canCraft = recipe.input.every((input) => (inventory[input.id] ?? 0) >= input.count);
                    return (
                      <div key={recipe.id} className={`recipe-card ${canCraft ? "ready" : ""}`}>
                        <div className="recipe-name">{recipe.name}</div>
                        <div className="recipe-row">
                          {recipe.input.map((input) => (
                            <div key={`${recipe.id}-${input.id}`} className="recipe-item">
                              <div className="item-icon" style={iconStyle(tileForBlockIcon(input.id), atlasUrl)} />
                              <div className="slot-count">{input.count}</div>
                            </div>
                          ))}
                          <div className="recipe-arrow">-&gt;</div>
                          <div className="recipe-item">
                            <div className="item-icon" style={iconStyle(tileForBlockIcon(recipe.output.id), atlasUrl)} />
                            <div className="slot-count">{recipe.output.count}</div>
                          </div>
                        </div>
                        <button
                          className="action"
                          disabled={!canCraft}
                          onClick={() => craft(recipe)}
                        >
                          Craft
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {!pointerLocked && !uiOpen && (
          <div className="overlay start">
            <div className="panel start-panel">
              <div className="title">Enter the Frontier</div>
              <p>WASD move | Space jump | Shift sprint | 1-9 hotbar | E inventory</p>
              <p>Left click breaks blocks | Right click places blocks | Esc unlocks</p>
              <button className="action" onClick={() => requestPointerLock?.()}>
                Start
              </button>
              <div className="hint">Tip: You can craft planks, bricks, glass, and torches from the inventory screen.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
