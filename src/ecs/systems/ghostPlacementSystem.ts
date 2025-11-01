import { useGameStore } from "../../state/store";
import { spawnBuildingAt } from "../world/createWorld";
import { getBuildCost } from "../../sim/buildCosts";
import type { World } from "../world/World";

export const GHOST_PLACEMENT_ID = "ghostPlacement";


const findCoreId = (world: World): number | null => {
  for (const [idStr, t] of Object.entries(world.entityType)) {
    if (t === "core") return Number(idStr);
  }
  return null;
};

export const ghostPlacementSystem = {
  id: GHOST_PLACEMENT_ID,
  update: (world: World, _dt: number) => {
    const state = useGameStore.getState();
    const queue = state.ghostQueue ?? [];
    if (queue.length === 0) return;

    const coreId = findCoreId(world);
    for (const ghost of [...queue]) {
      const cost = getBuildCost(ghost.type ?? "");
      // check core resources (Components only for now)
      let canAfford = true;
      if (coreId !== null && Object.keys(cost).length > 0) {
        const coreInv = world.inventory[coreId];
        if (!coreInv) {
          canAfford = false;
        } else {
          for (const [res, amt] of Object.entries(cost)) {
            const have = coreInv.contents[res] ?? 0;
            if (!Number.isFinite(have) || have < amt) {
              canAfford = false;
              break;
            }
          }
        }
      }

      if (canAfford) {
        // Deduct resources
        if (coreId !== null && Object.keys(cost).length > 0) {
          const coreInv = world.inventory[coreId];
          for (const [res, amt] of Object.entries(cost)) {
            coreInv.contents[res] = Math.max(0, (coreInv.contents[res] ?? 0) - amt);
          }
        }

        // Spawn building now
        spawnBuildingAt(world, ghost.type, Math.round(ghost.x), Math.round(ghost.y));

        // Remove ghost from queue in the store and update world
        useGameStore.setState((s) => ({ ghostQueue: s.ghostQueue.filter((g) => g.id !== ghost.id) }));
        useGameStore.setState({ world }, false);
      }
    }
  },
};

export default ghostPlacementSystem;
