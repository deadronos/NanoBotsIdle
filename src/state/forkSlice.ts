import { StateCreator } from "zustand";
import { RunBehaviorContext, defaultRunBehaviorContext } from "./forkContext";
import { ForkModuleRecord, applyAllModules } from "./applyForkModuleEffects";
import forkModulesData from "../data/forkModules.json";

export interface ForkSlice {
  // Currency (per run)
  forkPoints: number;

  // Purchased module IDs (per run)
  acquiredModules: string[];

  // Effective per-run behavior knobs, derived from modules
  runBehaviorContext: RunBehaviorContext;

  // Catalog (loaded from JSON)
  forkCatalog: ForkModuleRecord[];

  // Actions
  loadForkCatalog: () => void;
  grantForkPoints: (points: number) => void;
  canAffordModule: (id: string) => boolean;
  hasModule: (id: string) => boolean;
  canPurchaseModule: (id: string) => boolean;
  buyForkModule: (id: string) => void;
  recomputeBehaviorContext: () => void;
  resetForkState: () => void;
}

export const createForkSlice: StateCreator<ForkSlice, [], [], ForkSlice> = (
  set,
  get
) => ({
  forkPoints: 0,
  acquiredModules: [],
  runBehaviorContext: { ...defaultRunBehaviorContext },
  forkCatalog: [],

  loadForkCatalog: () => {
    set({ forkCatalog: forkModulesData as ForkModuleRecord[] });
  },

  grantForkPoints: (points: number) => {
    set((state) => ({ forkPoints: state.forkPoints + points }));
  },

  canAffordModule: (id: string) => {
    const state = get();
    const module = state.forkCatalog.find((m) => m.id === id);
    if (!module) return false;
    return state.forkPoints >= module.cost.amount;
  },

  hasModule: (id: string) => {
    return get().acquiredModules.includes(id);
  },

  canPurchaseModule: (id: string) => {
    const state = get();
    const module = state.forkCatalog.find((m) => m.id === id);
    if (!module) return false;
    
    // Check if already purchased
    if (state.hasModule(id)) return false;
    
    // Check if can afford
    if (!state.canAffordModule(id)) return false;
    
    // Check dependencies
    if (module.requires?.requiresModuleIds) {
      for (const reqId of module.requires.requiresModuleIds) {
        if (!state.hasModule(reqId)) return false;
      }
    }
    
    return true;
  },

  buyForkModule: (id: string) => {
    const state = get();
    if (!state.canPurchaseModule(id)) {
      console.warn(`Cannot purchase module ${id}`);
      return;
    }

    const module = state.forkCatalog.find((m) => m.id === id);
    if (!module) return;

    set((state) => ({
      forkPoints: state.forkPoints - module.cost.amount,
      acquiredModules: [...state.acquiredModules, id],
    }));

    // Recompute behavior context
    get().recomputeBehaviorContext();
  },

  recomputeBehaviorContext: () => {
    const state = get();
    const purchased = state.forkCatalog.filter((m) =>
      state.acquiredModules.includes(m.id)
    );
    const newContext = applyAllModules(defaultRunBehaviorContext, purchased);
    set({ runBehaviorContext: newContext });
  },

  resetForkState: () => {
    set({
      forkPoints: 0,
      acquiredModules: [],
      runBehaviorContext: { ...defaultRunBehaviorContext },
    });
  },
});
