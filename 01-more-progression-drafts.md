Awesome — here are the exact pieces you asked for, ready to drop in. They wire the Fork system end-to-end:

* A **run-local behavior context** with sensible defaults
* A **pure merge utility** to apply module effects (one or many)
* A **Zustand fork slice** (state + actions) to manage Fork Points, purchased modules, and behavior context
* A **ForkModal** React component that lists modules from JSON, shows costs, disables unaffordable items, and applies purchases

---

# 1) Run Behavior Context (types + defaults)

**`src/state/forkContext.ts`**

```ts
// Run-behavior knobs modified by Fork modules (per-run only)
export interface RunBehaviorContext {
  // Hauler behavior
  prefetchCriticalInputs: boolean;
  lowWaterThresholdFraction: number | null;

  // Builder behavior
  buildRadiusBonus: number;
  avoidDuplicateGhostTargets: boolean;

  // Emergency cooling routing overrides
  heatCriticalRoutingBoost: boolean;
  heatCriticalThresholdRatio: number;   // 0..1
  coolerPriorityOverride: number | null; // smaller = more urgent, 0 is highest

  // Recycling + recovery
  refundToFabricator: boolean;
  refundComponentsFraction: number;     // 0..1
  postForkRebuildBoost: boolean;

  // Overclock surge targeting
  overrideTaskPrioritiesDuringOverclock: boolean;
  overclockPrimaryTargets: string[];    // e.g. ["Fabricator","CoreCompiler"]
  overclockNonPrimaryPenalty: number;   // big number deprioritizes non-primaries
}

export const defaultRunBehaviorContext: RunBehaviorContext = {
  // Hauler
  prefetchCriticalInputs: false,
  lowWaterThresholdFraction: null,

  // Builder
  buildRadiusBonus: 0,
  avoidDuplicateGhostTargets: false,

  // Cooling
  heatCriticalRoutingBoost: false,
  heatCriticalThresholdRatio: 0.9,
  coolerPriorityOverride: null,

  // Recycling
  refundToFabricator: false,
  refundComponentsFraction: 0,
  postForkRebuildBoost: false,

  // Overclock surge
  overrideTaskPrioritiesDuringOverclock: false,
  overclockPrimaryTargets: [],
  overclockNonPrimaryPenalty: 0,
};
```

---

# 2) Apply Module Effects (pure utilities)

**`src/state/applyForkModuleEffects.ts`**

```ts
import { RunBehaviorContext } from "./forkContext";

// Shape of forkModule records loaded from JSON
export interface ForkModuleRecord {
  id: string;
  name: string;
  desc: string;
  cost: { currency: "ForkPoints"; amount: number };
  requires?: { requiresModuleIds?: string[] };
  effects: any; // see merge below; we merge known sections by key
}

// Deep-ish merge only on known keys, keeping it explicit/safe
export function applyModuleEffects(
  ctx: RunBehaviorContext,
  effects: any
): RunBehaviorContext {
  const next = { ...ctx };

  // droneBehavior
  if (effects?.droneBehavior) {
    const db = effects.droneBehavior;
    if (typeof db.prefetchCriticalInputs === "boolean")
      next.prefetchCriticalInputs = db.prefetchCriticalInputs;

    if (typeof db.buildRadiusBonus === "number")
      next.buildRadiusBonus = (next.buildRadiusBonus ?? 0) + db.buildRadiusBonus;

    if (typeof db.avoidDuplicateGhostTargets === "boolean")
      next.avoidDuplicateGhostTargets = db.avoidDuplicateGhostTargets;

    if (typeof db.lowWaterThresholdFraction === "number")
      next.lowWaterThresholdFraction = db.lowWaterThresholdFraction;
  }

  // demandPlanningSystem
  if (effects?.demandPlanningSystem) {
    const dps = effects.demandPlanningSystem;
    if (dps.lowWaterMarkEnabled === true && next.lowWaterThresholdFraction == null) {
      next.lowWaterThresholdFraction = dps.lowWaterThresholdFraction ?? 0.3;
    }
    if (dps.heatCriticalRoutingBoost === true) {
      next.heatCriticalRoutingBoost = true;
      if (typeof dps.heatCriticalThresholdRatio === "number") {
        next.heatCriticalThresholdRatio = dps.heatCriticalThresholdRatio;
      }
      if (typeof dps.coolerPriorityOverride === "number") {
        next.coolerPriorityOverride = dps.coolerPriorityOverride;
      }
    }
  }

  // recycling
  if (effects?.recycling) {
    const r = effects.recycling;
    if (r.refundToFabricator === true) next.refundToFabricator = true;
    if (typeof r.refundComponentsFraction === "number")
      next.refundComponentsFraction = Math.max(
        next.refundComponentsFraction,
        r.refundComponentsFraction
      );
  }
  if (effects?.swarmRegen?.postForkRebuildBoost === true) {
    next.postForkRebuildBoost = true;
  }

  // overclockBehavior
  if (effects?.overclockBehavior) {
    const ob = effects.overclockBehavior;
    if (ob.overrideTaskPrioritiesDuringOverclock === true)
      next.overrideTaskPrioritiesDuringOverclock = true;

    if (Array.isArray(ob.primaryTargets))
      next.overclockPrimaryTargets = ob.primaryTargets.slice();

    if (typeof ob.nonPrimaryPenalty === "number")
      next.overclockNonPrimaryPenalty = ob.nonPrimaryPenalty;
  }

  return next;
}

export function applyAllModules(
  base: RunBehaviorContext,
  modules: ForkModuleRecord[]
): RunBehaviorContext {
  return modules.reduce(
    (ctx, m) => applyModuleEffects(ctx, m.effects),
    { ...base }
  );
}
```

---

# 3) Fork Slice for Zustand (state + actions)

* Holds Fork Points, acquired module IDs, and the **run behavior context**
* Actions to **start a fork**, **purchase a module**, and **recompute** the context
* Integrates with your existing `GameState` (run + meta slices)

**`src/state/forkSlice.ts`**

```ts
import { StateCreator } from "zustand";
import { RunBehaviorContext, defaultRunBehaviorContext } from "./forkContext";
import { ForkModuleRecord, applyAllModules } from "./applyForkModuleEffects";
import forkModulesJson from "../../data/forkModules.json"; // typed as any or ForkModuleRecord[]

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
  startFork: (grantPoints: number) => void;
  canAffordModule: (id: string) => boolean;
  hasModule: (id: string) => boolean;
  buyForkModule: (id: string) => void;
  recomputeBehaviorContext: () => void;
}

export const createForkSlice: StateCreator<ForkSlice, [], [], ForkSlice> = (set, get) => ({
  forkPoints: 0,
  acquiredModules: [],
  runBehaviorContext: defaultRunBehaviorContext,
  forkCatalog: [],

  loadForkCatalog: () => {
    const arr = (forkModulesJson as any).forkModules as ForkModuleRecord[];
    set({ forkCatalog: arr ?? [] });
  },

  startFork: (grantPoints: number) => {
    // (Elsewhere you should handle killing drones, etc.)
    set({
      forkPoints: get().forkPoints + grantPoints,
      acquiredModules: [],
      runBehaviorContext: defaultRunBehaviorContext,
    });
  },

  canAffordModule: (id: string) => {
    const cat = get().forkCatalog;
    const mod = cat.find(m => m.id === id);
    if (!mod) return false;
    const cost = mod.cost?.amount ?? 0;
    return get().forkPoints >= cost;
  },

  hasModule: (id: string) => get().acquiredModules.includes(id),

  buyForkModule: (id: string) => {
    const { forkCatalog, forkPoints, acquiredModules } = get();
    const mod = forkCatalog.find(m => m.id === id);
    if (!mod) return;

    // prevent duplicates
    if (acquiredModules.includes(id)) return;

    // check deps
    const deps = mod.requires?.requiresModuleIds ?? [];
    const missing = deps.filter(d => !acquiredModules.includes(d));
    if (missing.length > 0) return;

    // check cost
    const cost = mod.cost?.amount ?? 0;
    if (forkPoints < cost) return;

    const newAcquired = [...acquiredModules, id];
    // recompute context
    const selected = forkCatalog.filter(m => newAcquired.includes(m.id));
    const newCtx = applyAllModules(defaultRunBehaviorContext, selected);

    set({
      forkPoints: forkPoints - cost,
      acquiredModules: newAcquired,
      runBehaviorContext: newCtx,
    });
  },

  recomputeBehaviorContext: () => {
    const { forkCatalog, acquiredModules } = get();
    const selected = forkCatalog.filter(m => acquiredModules.includes(m.id));
    const newCtx = applyAllModules(defaultRunBehaviorContext, selected);
    set({ runBehaviorContext: newCtx });
  },
});
```

**Wire the slice into your store** (if not already):

**`src/state/store.ts`**

```ts
import { create } from "zustand";
import { createForkSlice, ForkSlice } from "./forkSlice";
// import your RunSlice + MetaSlice as before…

export type GameState = /* RunSlice & MetaSlice & */ ForkSlice; // + others

export const useGameStore = create<GameState>()((...a) => ({
  // ...spread other slices:
  ...createForkSlice(...a),
}));
```

> If you already have `RunSlice`/`MetaSlice`, just intersect them in `GameState` and spread all creators into the same store initializer.

---

# 4) Fork Modal (React)

* Loads the module catalog (from JSON) on mount
* Shows current Fork Points
* Renders cards for each module (name, desc, cost, requirements)
* Purchase button is **disabled** if unaffordable, already owned, or deps missing
* Calls `buyForkModule(id)` to apply effects and update context

**`src/ui/panels/ForkModal.tsx`**

```tsx
import React, { useEffect, useMemo } from "react";
import { useGameStore } from "../../state/store";
import type { ForkModuleRecord } from "../../state/applyForkModuleEffects";

export interface ForkModalProps {
  open: boolean;
  onClose: () => void;
}

export const ForkModal: React.FC<ForkModalProps> = ({ open, onClose }) => {
  const forkPoints = useGameStore(s => s.forkPoints);
  const forkCatalog = useGameStore(s => s.forkCatalog);
  const acquired = useGameStore(s => s.acquiredModules);
  const loadForkCatalog = useGameStore(s => s.loadForkCatalog);
  const canAffordModule = useGameStore(s => s.canAffordModule);
  const hasModule = useGameStore(s => s.hasModule);
  const buyForkModule = useGameStore(s => s.buyForkModule);

  useEffect(() => {
    if (forkCatalog.length === 0) loadForkCatalog();
  }, [forkCatalog.length, loadForkCatalog]);

  const rows: Array<{
    mod: ForkModuleRecord;
    owned: boolean;
    depsMissing: string[];
    affordable: boolean;
  }> = useMemo(() => {
    return (forkCatalog ?? []).map(mod => {
      const owned = hasModule(mod.id);
      const deps = mod.requires?.requiresModuleIds ?? [];
      const depsMissing = deps.filter(d => !acquired.includes(d));
      const affordable = canAffordModule(mod.id);
      return { mod, owned, depsMissing, affordable };
    });
  }, [forkCatalog, acquired, hasModule, canAffordModule]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 text-neutral-100 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-xl font-semibold">Fork Process: Behavior Modules</h2>
          <button className="rounded px-3 py-1 bg-neutral-800 hover:bg-neutral-700"
                  onClick={onClose}>
            Close
          </button>
        </div>

        <div className="px-5 py-3 text-sm text-neutral-300">
          Fork Points available: <span className="font-semibold text-white">{forkPoints}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          {rows.map(({ mod, owned, depsMissing, affordable }) => {
            const disabled = owned || depsMissing.length > 0 || !affordable;
            return (
              <div key={mod.id} className="rounded-xl border border-neutral-800 p-4 bg-neutral-900/70">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{mod.name}</h3>
                    <p className="text-sm text-neutral-300 mt-1">{mod.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-400">Cost</div>
                    <div className="text-base">
                      {mod.cost.amount} FP
                    </div>
                  </div>
                </div>

                {depsMissing.length > 0 && (
                  <div className="mt-2 text-xs text-amber-300">
                    Requires: {depsMissing.join(", ")}
                  </div>
                )}

                {owned && (
                  <div className="mt-2 text-xs text-emerald-400">
                    Owned
                  </div>
                )}

                <div className="mt-4">
                  <button
                    disabled={disabled}
                    onClick={() => buyForkModule(mod.id)}
                    className={
                      "w-full rounded-lg px-3 py-2 font-medium " +
                      (disabled
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white")
                    }
                  >
                    {owned ? "Purchased" : depsMissing.length ? "Dependencies Missing" : affordable ? "Purchase" : "Not Enough FP"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-neutral-400">
            Tip: Forking scraps your current drones to grant Fork Points. New drones spawned after purchasing modules inherit the new behaviors immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
```

**Usage example in your UI:**

```tsx
// in BottomBar or a header action
const [open, setOpen] = useState(false);
<button onClick={() => setOpen(true)}>Fork Process</button>
<ForkModal open={open} onClose={() => setOpen(false)} />
```

---

## Notes on Integration with Systems

* **DemandPlanningSystem** should read:

  * `ctx.lowWaterThresholdFraction` to create early TaskRequests
  * `ctx.heatCriticalRoutingBoost` and `ctx.coolerPriorityOverride` to override priorities when `heatRatio >= ctx.heatCriticalThresholdRatio`
  * Overclock surge: if `world.globals.overclockEnabled && ctx.overrideTaskPrioritiesDuringOverclock`, then set `priorityScore=0` for targets in `ctx.overclockPrimaryTargets` and add `ctx.overclockNonPrimaryPenalty` to all other requests.

* **DroneAssignmentSystem** should:

  * For builders: respect `ctx.avoidDuplicateGhostTargets` by marking claimed ghosts
  * For haulers: you can later add `multiDrop` from meta (separate from Fork)

* **On Fork start** (elsewhere in your run actions):

  * Scrap current drones → optionally grant FP proportional to drone count/value
  * Call `startFork(grantPoints)`
  * Open the modal to let the player buy modules

That’s it — this gives you a tight, data-driven loop for Fork modules and a working UI surface to interact with them.
