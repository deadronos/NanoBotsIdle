import type { StateCreator } from "zustand";

import { createWorld } from "../ecs/world/createWorld";
import { warnUnimplemented } from "./utils";
import type { GameState, RunSlice, UISnapshot } from "./types";

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
  placeBuilding: (type, x, y) =>
    warnUnimplemented("placeBuilding not yet implemented", type, { x, y }),
  queueGhostBuilding: (type, x, y) =>
    warnUnimplemented("queueGhostBuilding not yet implemented", type, { x, y }),
  triggerFork: () => warnUnimplemented("triggerFork not yet implemented"),
  toggleOverclock: (on) => {
    const state = get();
    state.world.globals.overclockEnabled = on;
    set({ overclockArmed: on });
  },
  prestigeNow: () => warnUnimplemented("prestigeNow not yet implemented"),
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
