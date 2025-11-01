import type { StateCreator } from "zustand";

import { createWorld } from "../ecs/world/createWorld";
import { warnUnimplemented } from "./utils";
import { spawnBuildingAt } from "../ecs/world/createWorld";
import { getUpgradeCost } from "../sim/buildCosts";
import type { GameState, RunSlice, UISnapshot, GhostEntry } from "./types";

export const createInitialSnapshot = (): UISnapshot => ({
  heatCurrent: 0,
  heatSafeCap: 0,
  heatRatio: 0,
  powerAvailable: 0,
  powerDemand: 0,
  throughput: 0,
  projectedShards: 0,
  currentPhase: 1,
  simTimeSeconds: 0,
  overclockEnabled: false,
  canFork: false,
  canPrestige: false,
  bottlenecks: [],
  drones: [],
  buildings: [],
});

export const createRunSlice: StateCreator<GameState, [], [], RunSlice> = (
  set,
  get,
  _api,
) => ({
  world: createWorld(),
  uiSnapshot: createInitialSnapshot(),
  projectedCompileShards: 0,
  forkPoints: 0,
  selectedEntity: null,
  currentPhase: 1,
  overclockArmed: false,
  ghostQueue: [] as GhostEntry[],
  placementState: { activeType: null },
  placeBuilding: (type, x, y) => {
    const world = get().world;

    // Basic placement check: ensure grid cell is walkable and unoccupied
    if (!world.grid.isWalkable(Math.round(x), Math.round(y))) {
      return false as any;
    }

    // Ensure no entity occupies the same snapped position
    const occupied = Object.values(world.position).some((pos) =>
      pos && Math.round(pos.x) === Math.round(x) && Math.round(pos.y) === Math.round(y),
    );

    if (occupied) {
      return false as any;
    }

    // Basic resource check: consult centralized build cost table and deduct from core if possible
    // Import getBuildCost lazily to avoid circular imports at module top-level
    // (module paths are stable so a direct import is acceptable)
    // Determine core id
    // Immediate placement: spawn directly. If resources should be enforced, prefer enqueueing + ghostPlacementSystem.
    spawnBuildingAt(world, type, Math.round(x), Math.round(y));
    // update world in state so consumers can pick up changes (uiSnapshotSystem will publish snapshot)
    set({ world });
    return true as any;
  },
  queueGhostBuilding: (type, x, y) => {
    const id = `${Date.now().toString(36)}-${Math.floor(Math.random() * 100000)}`;
    const entry: GhostEntry = { id, type, x: Math.round(x), y: Math.round(y), createdAt: Date.now() };
    set((s) => ({ ghostQueue: [...s.ghostQueue, entry] }));
  },
  startPlacement: (type) => set({ placementState: { activeType: type } }),
  cancelPlacement: () => set({ placementState: { activeType: null } }),
  confirmPlacementAt: (x, y) => {
    const state = get();
    const type = state.placementState.activeType;
    if (!type) {
      return;
    }
    const placed = state.placeBuilding(type, x, y) as boolean;
    if (!placed) {
      state.queueGhostBuilding(type, x, y);
      set({ placementMessage: `Insufficient resources or blocked — ${type} queued` });
    } else {
      // clear any prior message
      set({ placementMessage: null });
    }
    // always exit placement mode after confirm
    set({ placementState: { activeType: null } });
  },
  removeQueuedGhost: (id) => set((s) => ({ ghostQueue: s.ghostQueue.filter((g) => g.id !== id) })),
  applyUpgrade: (upgradeId, targetEntityId) => {
    const state = get();
    const world = state.world;
    const target = typeof targetEntityId === "number" ? targetEntityId : state.selectedEntity;
    if (target == null) {
      set({ placementMessage: "No building selected to upgrade" });
      return;
    }

    const producer = world.producer[target];
    if (!producer) {
      set({ placementMessage: "Selected entity cannot be upgraded" });
      return;
    }

    const cost = getUpgradeCost(upgradeId);

    // Pay shards if required via MetaSlice.spendShards
    if ((cost.shards ?? 0) > 0) {
      const paid = state.spendShards(cost.tree ?? "compiler", upgradeId);
      if (!paid) {
        set({ placementMessage: `Insufficient compile shards for ${upgradeId}` });
        return;
      }
    }

    // Pay fork points if required
    if ((cost.forkPoints ?? 0) > 0) {
      const needed = cost.forkPoints ?? 0;
      if (state.forkPoints < needed) {
        set({ placementMessage: `Insufficient fork points for ${upgradeId}` });
        return;
      }
      set({ forkPoints: Math.max(0, state.forkPoints - needed) });
    }

    const id = upgradeId.toLowerCase();
    switch (id) {
      case "tier":
        producer.tier = (producer.tier ?? 1) + 1;
        // modestly increase baseRate for new tier
        producer.baseRate = (producer.baseRate ?? 1) * 1.25;
        set({ placementMessage: `Tier upgraded on entity ${target}` });
        break;
      case "throughput":
        producer.baseRate = (producer.baseRate ?? 1) * 1.5;
        set({ placementMessage: `Throughput boost applied to ${target}` });
        break;
      default:
        set({ placementMessage: `Unknown upgrade: ${upgradeId}` });
        break;
    }

    // persist world change
    set({ world });
  },
  triggerFork: () => warnUnimplemented("triggerFork not yet implemented"),
  toggleOverclock: (on) => {
    const state = get();
    state.world.globals.overclockEnabled = on;
    set({ overclockArmed: on });
  },
  prestigeNow: () => warnUnimplemented("prestigeNow not yet implemented"),
  placementMessage: null,
  removePlacementMessage: () => set({ placementMessage: null }),
  setPlacementMessage: (msg) => set({ placementMessage: msg }),
  setWorld: (world) => set({ world }),
  setUISnapshot: (snapshot) => set({ uiSnapshot: snapshot }),
  setProjectedShards: (shards) =>
    set({
      projectedCompileShards: Math.max(
        0,
        Number.isFinite(shards) ? shards : 0,
      ),
    }),
  setPhase: (phase) => set({ currentPhase: phase }),
  addForkPoints: (amount) =>
    set((state) => ({
      forkPoints: Math.max(
        0,
        state.forkPoints + (Number.isFinite(amount) ? amount : 0),
      ),
    })),
  setSelectedEntity: (entityId) => set({ selectedEntity: entityId }),
});
