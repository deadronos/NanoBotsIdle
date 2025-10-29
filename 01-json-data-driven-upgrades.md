Yes. We're going to make this all data-driven instead of hardcoding it into a million switch statements.

Below are JSON-style definitions for:

1. **Meta upgrades** (persistent, bought with Compile Shards after prestige)

   * Tree: `swarmCognition`, `bioStructure`, `compilerOptimization`
2. **Fork modules** (intra-run behavior unlocks)

   * Purchased with Fork Points mid-run
   * Only affect the current run

I’ll also include suggested fields you’ll want in code so systems can consume these cleanly:

* `id`: unique key
* `name`, `desc`: UI text
* `cost`: currency and amount
* `requires`: gating (like minPrestiges, or dependency on another upgrade)
* `effects`: machine-consumable effect payload we can apply

These are meant to live in something like `data/upgrades.json` and `data/forkModules.json`. We can load them into the store at boot.

---

## 1. Meta Upgrades Data (persistent, Compile Shards)

We'll represent each upgrade tier as its own node. You can either force linear progression (Tier 1 → Tier 2 → …) using `requires`, or later allow branching trees.

```json
{
  "swarmCognition": [
    {
      "id": "swarm.congestionAwareness",
      "name": "Congestion Awareness",
      "desc": "Drones avoid traffic hotspots, increasing hauling efficiency at higher swarm sizes.",
      "cost": { "currency": "CompileShards", "amount": 5 },
      "requires": {
        "minPrestiges": 0,
        "requiresUpgradeIds": []
      },
      "effects": {
        "swarm": {
          "congestionAvoidanceLevel": 1
        }
      }
    },
    {
      "id": "swarm.predictiveHauling",
      "name": "Predictive Hauling",
      "desc": "Haulers prefetch inputs for high-priority buildings before they run dry.",
      "cost": { "currency": "CompileShards", "amount": 15 },
      "requires": {
        "minPrestiges": 1,
        "requiresUpgradeIds": ["swarm.congestionAwareness"]
      },
      "effects": {
        "swarm": {
          "prefetchUnlocked": true
        }
      }
    },
    {
      "id": "swarm.specialistSeed",
      "name": "Specialist Seed",
      "desc": "Start each run with +1 Hauler, +1 Builder, +1 Maintainer already active.",
      "cost": { "currency": "CompileShards", "amount": 40 },
      "requires": {
        "minPrestiges": 3,
        "requiresUpgradeIds": ["swarm.predictiveHauling"]
      },
      "effects": {
        "swarm": {
          "startingSpecialists": { "hauler": 1, "builder": 1, "maintainer": 1 }
        }
      }
    },
    {
      "id": "swarm.coordinatedDispatch",
      "name": "Coordinated Dispatch",
      "desc": "Haulers can serve multiple delivery targets in a single trip.",
      "cost": { "currency": "CompileShards", "amount": 100 },
      "requires": {
        "minPrestiges": 6,
        "requiresUpgradeIds": ["swarm.specialistSeed"]
      },
      "effects": {
        "swarm": {
          "multiDropUnlocked": true
        }
      }
    }
  ],

  "bioStructure": [
    {
      "id": "bio.preGrownTissue",
      "name": "Pre-Grown Tissue Radius",
      "desc": "Begin each run with an expanded viable build radius around the Core.",
      "cost": { "currency": "CompileShards", "amount": 5 },
      "requires": {
        "minPrestiges": 0,
        "requiresUpgradeIds": []
      },
      "effects": {
        "bio": {
          "startingRadius": 6
        }
      }
    },
    {
      "id": "bio.hardenedCoolingVeins",
      "name": "Hardened Cooling Veins",
      "desc": "Your bio-core circulates coolant more efficiently. Higher safe heat capacity.",
      "cost": { "currency": "CompileShards", "amount": 15 },
      "requires": {
        "minPrestiges": 1,
        "requiresUpgradeIds": ["bio.preGrownTissue"]
      },
      "effects": {
        "bio": {
          "passiveCoolingBonus": 1
        }
      }
    },
    {
      "id": "bio.preInfusedExtractor",
      "name": "Pre-Infused Extractor",
      "desc": "Initial Extractor boots at Tier 2 for higher atom throughput.",
      "cost": { "currency": "CompileShards", "amount": 40 },
      "requires": {
        "minPrestiges": 2,
        "requiresUpgradeIds": ["bio.hardenedCoolingVeins"]
      },
      "effects": {
        "bio": {
          "startingExtractorTier": 2
        }
      }
    },
    {
      "id": "bio.seedStockpile",
      "name": "Seed Stockpile",
      "desc": "Core spawns with Components and TissueMass so you can expand and print drones instantly.",
      "cost": { "currency": "CompileShards", "amount": 100 },
      "requires": {
        "minPrestiges": 5,
        "requiresUpgradeIds": ["bio.preInfusedExtractor"]
      },
      "effects": {
        "bio": {
          "startingCoreInventory": {
            "Components": 20,
            "TissueMass": 10
          }
        }
      }
    }
  ],

  "compilerOptimization": [
    {
      "id": "compiler.yieldMult",
      "name": "Yield Multiplier",
      "desc": "+20% Compile Shards gained when you Recompile Core.",
      "cost": { "currency": "CompileShards", "amount": 5 },
      "requires": {
        "minPrestiges": 0,
        "requiresUpgradeIds": []
      },
      "effects": {
        "compiler": {
          "compileYieldMult": 1.2
        }
      }
    },
    {
      "id": "compiler.thermalOverdriveTuning",
      "name": "Thermal Overdrive Tuning",
      "desc": "Overclock generates less excess heat, so you can stay in stress mode longer.",
      "cost": { "currency": "CompileShards", "amount": 15 },
      "requires": {
        "minPrestiges": 2,
        "requiresUpgradeIds": ["compiler.yieldMult"]
      },
      "effects": {
        "compiler": {
          "overclockEfficiencyBonus": 1
        }
      }
    },
    {
      "id": "compiler.efficientRecycling",
      "name": "Efficient Recycling",
      "desc": "Scrapping drones/buildings in Phase 3 yields +30% more shards.",
      "cost": { "currency": "CompileShards", "amount": 40 },
      "requires": {
        "minPrestiges": 4,
        "requiresUpgradeIds": ["compiler.thermalOverdriveTuning"]
      },
      "effects": {
        "compiler": {
          "recycleBonus": 0.3
        }
      }
    },
    {
      "id": "compiler.recursiveCompilePath",
      "name": "Recursive Compile Path",
      "desc": "Start each run with +1 Fork Point pre-charged.",
      "cost": { "currency": "CompileShards", "amount": 100 },
      "requires": {
        "minPrestiges": 7,
        "requiresUpgradeIds": ["compiler.efficientRecycling"]
      },
      "effects": {
        "compiler": {
          "startingForkPoints": 1
        }
      }
    }
  ]
}
```

### Notes on how you'd apply these effects in code:

* After prestige, when you rebuild the world with `createWorld()`, you fold in all purchased upgrades:

  * Merge every `effects.swarm` into the `swarm` param.
  * Merge every `effects.bio` into the `bio` param.
  * Merge every `effects.compiler` into the `compiler` param.
* That gives you a consolidated “final” meta snapshot → that goes into `createWorld({ swarm, bio, compiler })`.

For additive values, you'd sum/merge them. For overriders (like `startingRadius = 6`), you'd take the max.

---

## 2. Fork Modules Data (run-local behaviors)

Fork modules are bought with Fork Points *during the same run*. They do not persist after prestige.

Goals for this data:

* Keep same shape as meta upgrades where possible
* But currency is `"ForkPoints"`, and no `minPrestiges`
* Effects mostly target DroneBrain behavior and system priorities

```json
{
  "forkModules": [
    {
      "id": "fork.predictiveHauler",
      "name": "Predictive Hauler",
      "desc": "Haulers prefetch inputs before factories are empty, reducing idle time.",
      "cost": { "currency": "ForkPoints", "amount": 1 },
      "requires": {
        "requiresModuleIds": []
      },
      "effects": {
        "droneBehavior": {
          "prefetchCriticalInputs": true
        },
        "demandPlanningSystem": {
          "lowWaterMarkEnabled": true,
          "lowWaterThresholdFraction": 0.3
        }
      }
    },

    {
      "id": "fork.builderSwarmInstinct",
      "name": "Builder Swarm Instinct",
      "desc": "Builder drones coordinate to finish multiple ghost structures efficiently.",
      "cost": { "currency": "ForkPoints", "amount": 1 },
      "requires": {
        "requiresModuleIds": []
      },
      "effects": {
        "droneBehavior": {
          "buildRadiusBonus": 4,
          "avoidDuplicateGhostTargets": true
        }
      }
    },

    {
      "id": "fork.emergencyCoolingProtocol",
      "name": "Emergency Cooling Protocol",
      "desc": "When heat is critical, the swarm prioritizes cooling logistics above everything else.",
      "cost": { "currency": "ForkPoints", "amount": 2 },
      "requires": {
        "requiresModuleIds": []
      },
      "effects": {
        "demandPlanningSystem": {
          "heatCriticalRoutingBoost": true,
          "heatCriticalThresholdRatio": 0.9,
          "coolerPriorityOverride": 0
        }
      }
    },

    {
      "id": "fork.cannibalizeAndReforge",
      "name": "Cannibalize & Reforge",
      "desc": "Scrapped drones and buildings partially refund into Fabricator inventory.",
      "cost": { "currency": "ForkPoints", "amount": 2 },
      "requires": {
        "requiresModuleIds": []
      },
      "effects": {
        "recycling": {
          "refundToFabricator": true,
          "refundComponentsFraction": 0.5
        },
        "swarmRegen": {
          "postForkRebuildBoost": true
        }
      }
    },

    {
      "id": "fork.prioritySurge",
      "name": "Priority Surge",
      "desc": "During Overclock, all logistics tunnels into Fabricator and CoreCompiler, starving everything else.",
      "cost": { "currency": "ForkPoints", "amount": 3 },
      "requires": {
        "requiresModuleIds": []
      },
      "effects": {
        "overclockBehavior": {
          "overrideTaskPrioritiesDuringOverclock": true,
          "primaryTargets": ["Fabricator", "CoreCompiler"],
          "nonPrimaryPenalty": 1000
        }
      }
    }
  ]
}
```

### How Fork modules are applied in code:

Workflow at runtime:

1. Player hits **Fork Process**.
2. We do:

   * Kill all existing drones.
   * Grant `forkPoints += X`.
   * Show a modal with these modules.
3. Player buys modules.
4. We apply their `effects` to a **run-local behavior profile template** for drones and systems.

   * New drones spawned after fork inherit that enhanced profile.
   * Systems like `DemandPlanningSystem` and `DroneAssignmentSystem` read flags like `heatCriticalRoutingBoost` directly.

Concretely, after fork you can build a `RunBehaviorContext` object like:

```ts
export interface RunBehaviorContext {
  // hauler behavior
  prefetchCriticalInputs: boolean;
  lowWaterThresholdFraction: number | null;

  // builder behavior
  buildRadiusBonus: number;
  avoidDuplicateGhostTargets: boolean;

  // emergency cooling
  heatCriticalRoutingBoost: boolean;
  heatCriticalThresholdRatio: number;
  coolerPriorityOverride: number | null;

  // recycling
  refundToFabricator: boolean;
  refundComponentsFraction: number;
  postForkRebuildBoost: boolean;

  // overclock surge
  overrideTaskPrioritiesDuringOverclock: boolean;
  overclockPrimaryTargets: string[];
  overclockNonPrimaryPenalty: number;
}
```

When you apply fork modules, you basically merge their `effects` into that context.

Then:

* `DroneAssignmentSystem` and `DemandPlanningSystem` read from `RunBehaviorContext` every tick.
* When you spawn new drones post-fork, you inject selected behavior flags into each new droneBrain.behavior.

This keeps fork logic fully data-driven: new module? Add it to JSON and merge it into context. No rewrite of systems.

---

## How this slots into the rest of the codebase

* The **meta upgrade JSON** feeds into:

  * `metaSlice` hydration after prestige
  * `createWorld({ swarm, bio, compiler })`
* The **fork module JSON** feeds into:

  * a `forkSlice` inside run state (we haven’t added yet but we can), e.g.:

    ```ts
    interface ForkSlice {
      forkPoints: number;
      acquiredModules: string[]; // e.g. ["fork.predictiveHauler", ...]
      runBehaviorContext: RunBehaviorContext;
    }
    ```
  * After Fork, the game recalculates `runBehaviorContext` by folding all purchased module `effects` together

You now have:

* A clean data layer to drive upgrades and fork behaviors
* Separation between persistent meta and per-run evolution
* Hooks into systems and brain logic that match what we already designed in Track 1

If you want next, I can generate:

* `runBehaviorContext` default object
* a reducer-style “applyModuleEffects(context, module.effects)” function
* and a `ForkModal` React skeleton that:

  * lists available `forkModules`
  * shows cost / description
  * disables ones you can’t afford
  * applies updates to store when you buy them

That gives you enough to start wiring actual UI to actual state.
