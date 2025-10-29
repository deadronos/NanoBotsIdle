Nice. Locking in the next layer: balance formulas, world bootstrapping from meta, and the UI snapshot data path.

I’ll give you:

1. `balance.ts` — costs, throughput, shard calculation (with polynomial scaling)
2. `createWorld(meta)` — how a new run is initialized using persistent upgrades
3. `uiSnapshotSystem(world)` — what React reads each frame

All code below is TypeScript-style sketches you can drop into `src/sim/balance.ts`, `src/ecs/world/createWorld.ts`, `src/ecs/systems/uiSnapshotSystem.ts`, etc.

---

## 1. `balance.ts`

Goals:

* Polynomial scaling, not exponential
* Heat-limited throughput
* Prestige shards reward pushing the Phase 3 stress window

We’ll define helpers, so all systems read from one source of truth.

```ts
// src/sim/balance.ts

import { World } from "../ecs/world/World";
import { ResourceName } from "../types/resources";

// ==============================
// 1. UPGRADE / COST CURVES
// ==============================

// quadratic cost curve for building upgrades, drone production, etc.
// cost(n) = base * (n^2 * scaleA + n * scaleB + scaleC)
export function polyCost(
  level: number,
  base: number,
  scaleA = 1,
  scaleB = 1,
  scaleC = 1
): number {
  // level is the level you're buying (e.g. upgrading from 4->5 means level=5)
  const n = level;
  return base * (n * n * scaleA + n * scaleB + scaleC);
}

// Example usage idea (not enforced here, just guidance):
// - Drone #1, #2, #3 cheap
// - Drone #10 noticeably pricier
export function getDroneFabricationCost(droneIndex: number): Record<ResourceName, number> {
  // droneIndex is 1-based ("the 5th drone you're building")
  const cost = Math.floor(polyCost(droneIndex, 5, 0.6, 0.8, 1));
  return {
    Components: cost, // fabricate new drone bodies from Components
  };
}

// Extractor tier upgrade cost
export function getExtractorUpgradeCost(newTier: number): Record<ResourceName, number> {
  const cost = Math.floor(polyCost(newTier, 20, 1.0, 1.0, 2));
  return {
    Components: cost,
    TissueMass: Math.floor(cost * 0.25),
  };
}

// ==============================
// 2. THROUGHPUT / PRODUCTION
// ==============================

// production throughput for a Producer component
// output_per_sec = k * (tier^1.5) / (1 + heatRatio)
//
// k = baseRate
// heatRatio = currentHeat / safeHeatCap
//
// if overclock, we multiply k and increase heat in HeatSystem
export function getProducerOutputPerSec(params: {
  baseRate: number;     // producer.baseRate
  tier: number;         // producer.tier
  heatCurrent: number;
  heatSafeCap: number;
}): number {
  const { baseRate, tier, heatCurrent, heatSafeCap } = params;

  const heatRatio = heatSafeCap > 0 ? heatCurrent / heatSafeCap : 0;
  const tierMult = Math.pow(tier, 1.5);

  const outputPerSec = (baseRate * tierMult) / (1 + heatRatio);

  // never negative
  return Math.max(0, outputPerSec);
}

// ==============================
// 3. DRONE HAULING EFFICIENCY
// ==============================
//
// We soft-cap swarm hauling throughput with congestion.
// haul_rate = D * base_haul_rate * efficiency
// efficiency = 1 / (1 + (D / K)^2)
// K scales with "swarm cognition" meta upgrades.
export function getHaulingEffectiveRate(params: {
  haulerCount: number;
  basePerDrone: number;
  optimalDensity: number; // K from meta (higher K = smarter swarm)
}): number {
  const { haulerCount, basePerDrone, optimalDensity } = params;

  if (haulerCount <= 0) return 0;
  const ratio = haulerCount / Math.max(1, optimalDensity);
  const efficiency = 1 / (1 + ratio * ratio);

  const totalRate = haulerCount * basePerDrone * efficiency;
  return totalRate;
}

// ==============================
// 4. COMPILE SHARD YIELD
// ==============================
//
// compile_shards = A * sqrt(peak_throughput)
//                + B * log2(cohesion_score + 1)
//                + C * (stress_seconds)^0.7
//
// Then multiplied by persistent meta bonus.
export function getCompileShardEstimate(params: {
  peakThroughput: number;        // max atoms/sec processed this run
  cohesionScore: number;         // how "smooth" logistics ran
  stressSecondsAccum: number;    // survived time in overclock
  yieldMult: number;             // from CompilerOptimizationUpgrades.compileYieldMult
}): number {
  const { peakThroughput, cohesionScore, stressSecondsAccum, yieldMult } = params;

  const A = 1.5;
  const B = 4.0;
  const C = 0.9;

  // Helpers with safety
  const safeLog = (x: number) => Math.log2(Math.max(1, x));

  const termThroughput = A * Math.sqrt(Math.max(0, peakThroughput));
  const termCohesion   = B * safeLog(cohesionScore + 1); // +1 avoids log2(0)
  const termStress     = C * Math.pow(Math.max(0, stressSecondsAccum), 0.7);

  const raw = termThroughput + termCohesion + termStress;

  return raw * yieldMult;
}

// We can also compute cohesion incrementally as:
// cohesionScore += (all_requests_fulfilled_this_tick ? 1 : 0)
// or more nuanced: (1 - starvationRatio) per second.
// That’ll happen in compileScoringSystem.

```

Notes:

* `polyCost()` gives you predictable quadratic-ish scaling.
* `getProducerOutputPerSec()` enforces the “heat fights throughput” fantasy.
* `getCompileShardEstimate()` plugs directly into the prestige button logic.

---

## 2. `createWorld(meta)`

This sets up a fresh run using whatever you’ve unlocked in meta.
We’ll respect:

* starting radius
* starting extractor tier
* passive cooling bonus
* starting drones of certain roles
* etc.

We'll define a `createWorld` that:

1. Creates a new `World`
2. Spawns the Core
3. Spawns starting tiles / power vein stubs / extractor / assembler / fabricator
4. Spawns initial drones with brain behavior seeded from meta upgrades

```ts
// src/ecs/world/createWorld.ts

import { World } from "./World";
import { EntityId } from "./EntityId";
import { SwarmCognitionUpgrades, BioStructureUpgrades, CompilerOptimizationUpgrades } from "../../state/metaSlice";
import { DroneBrain, BehaviorProfile } from "../components/DroneBrain";
import { Position } from "../components/Position";
import { Inventory } from "../components/Inventory";
import { Producer } from "../components/Producer";
import { HeatSource } from "../components/HeatSource";
import { HeatSink } from "../components/HeatSink";
import { PowerLink } from "../components/PowerLink";
import { Overclockable } from "../components/Overclockable";
import { CompileEmitter } from "../components/CompileEmitter";
import { BuildingType, Recipe } from "../../types/buildings";
import { ResourceName } from "../../types/resources";

export interface CreateWorldParams {
  swarm: SwarmCognitionUpgrades;
  bio: BioStructureUpgrades;
  compiler: CompilerOptimizationUpgrades;
}

// Helper to allocate new entity IDs
function makeEntity(world: World, type: string): EntityId {
  const id = world.nextEntityId++;
  world.entityType[id] = type as any;
  return id;
}

// Basic "default" behavior profile using meta unlocks
function getBaseBehaviorProfile(
  swarm: SwarmCognitionUpgrades
): BehaviorProfile {
  return {
    priorityRules: [
      // higher-level logic UI will edit these later:
      // Fabricator first, Assembler second, Storage last
      { targetType: "Fabricator", priority: 0 },
      { targetType: "Assembler",  priority: 1 },
      { targetType: "Storage",    priority: 2 },
    ],
    prefetchCriticalInputs: swarm.prefetchUnlocked,
    buildRadius: 5 + swarm.startingSpecialists.builder, // tiny bump
    congestionAvoidance: swarm.congestionAvoidanceLevel, // 0..2 etc.
  };
}

// We'll define a tiny sample recipe for the starting Extractor
const START_EXTRACTOR_RECIPE: Recipe = {
  inputs: {}, // extractors pull from "ground", so no input
  outputs: { Carbon: 1 }, // 1 Carbon per batch, arbitrary baseline
  batchTimeSeconds: 1,
};

// Basic assembler for Components from Carbon
const START_ASSEMBLER_RECIPE: Recipe = {
  inputs: { Carbon: 2 },
  outputs: { Components: 1 },
  batchTimeSeconds: 2,
};

// Fabricator turns Components -> DroneFrame (for building drones)
const START_FABRICATOR_RECIPE: Recipe = {
  inputs: { Components: 3 },
  outputs: { DroneFrame: 1 },
  batchTimeSeconds: 5,
};

export function createWorld(params: CreateWorldParams): World {
  const { swarm, bio, compiler } = params;

  const world: World = {
    nextEntityId: 1,

    position: {},
    inventory: {},
    producer: {},
    heatSource: {},
    heatSink: {},
    powerLink: {},
    droneBrain: {},
    path: {},
    overclockable: {},
    compileEmitter: {},

    entityType: {},

    globals: {
      heatCurrent: 0,
      heatSafeCap: 100 + bio.passiveCoolingBonus * 20, // meta can bump this
      powerAvailable: 10,
      powerDemand: 0,
      overclockEnabled: false,
      peakThroughput: 0,
      cohesionScore: 0,
      stressSecondsAccum: 0,
      simTimeSeconds: 0,
    },

    taskRequests: [],

    grid: {
      width: 64,
      height: 64,
      walkCost: new Array(64 * 64).fill(1), // uniform for now
    },
  };

  // ---------------------------------
  // Create Core (the heart / control)
  // ---------------------------------
  const coreId = makeEntity(world, "Core");

  world.position[coreId] = { x: 32, y: 32 } as Position;

  world.inventory[coreId] = {
    capacity: 999,
    contents: {},
  } as Inventory;

  // Core acts as heat source a bit (idling)
  world.heatSource[coreId] = {
    heatPerSecond: 0.2,
  } as HeatSource;

  // Core has some cooling baseline if bio.passiveCoolingBonus > 0
  if (bio.passiveCoolingBonus > 0) {
    world.heatSink[coreId] = {
      coolingPerSecond: 0.2 * bio.passiveCoolingBonus,
    } as HeatSink;
  }

  world.powerLink[coreId] = {
    demand: 1,
    priority: 0,
    online: true,
  } as PowerLink;

  world.compileEmitter[coreId] = {
    throughputWeight: 1,
    cohesionWeight: 1,
  } as CompileEmitter;

  // ---------------------------------
  // Create starting Extractor
  // ---------------------------------
  const extractorId = makeEntity(world, "Extractor");

  world.position[extractorId] = { x: 34, y: 32 };
  world.inventory[extractorId] = {
    capacity: 50,
    contents: {}, // produced Carbon will accumulate here
  };

  world.producer[extractorId] = {
    recipe: START_EXTRACTOR_RECIPE,
    progress: 0,
    baseRate: 1, // items/sec baseline at tier1 in perfect heat
    tier: bio.startingExtractorTier, // meta can start higher tier
    active: true,
  } as Producer;

  world.heatSource[extractorId] = {
    heatPerSecond: 0.5 * bio.startingExtractorTier,
  } as HeatSource;

  world.powerLink[extractorId] = {
    demand: 1,
    priority: 1,
    online: true,
  } as PowerLink;

  world.overclockable[extractorId] = {
    safeRateMult: 1.0,
    overRateMult: 2.0,
    heatMultiplier: 3.0,
  } as Overclockable;

  world.compileEmitter[extractorId] = {
    throughputWeight: 1,
    cohesionWeight: 0.2,
  };

  // ---------------------------------
  // Create starting Assembler
  // ---------------------------------
  const assemblerId = makeEntity(world, "Assembler");

  world.position[assemblerId] = { x: 32, y: 34 };
  world.inventory[assemblerId] = {
    capacity: 50,
    contents: {},
  };

  world.producer[assemblerId] = {
    recipe: START_ASSEMBLER_RECIPE,
    progress: 0,
    baseRate: 0.5,
    tier: 1,
    active: true,
  };

  world.heatSource[assemblerId] = {
    heatPerSecond: 0.7,
  };

  world.powerLink[assemblerId] = {
    demand: 2,
    priority: 2,
    online: true,
  };

  world.overclockable[assemblerId] = {
    safeRateMult: 1.0,
    overRateMult: 2.5,
    heatMultiplier: 4.0,
  };

  world.compileEmitter[assemblerId] = {
    throughputWeight: 1,
    cohesionWeight: 0.4,
  };

  // ---------------------------------
  // Create starting Fabricator
  // ---------------------------------
  const fabId = makeEntity(world, "Fabricator");

  world.position[fabId] = { x: 30, y: 32 };
  world.inventory[fabId] = {
    capacity: 50,
    contents: {},
  };

  world.producer[fabId] = {
    recipe: START_FABRICATOR_RECIPE,
    progress: 0,
    baseRate: 0.25,
    tier: 1,
    active: true,
  };

  world.heatSource[fabId] = {
    heatPerSecond: 1.0,
  };

  world.powerLink[fabId] = {
    demand: 2,
    priority: 1,
    online: true,
  };

  world.overclockable[fabId] = {
    safeRateMult: 1.0,
    overRateMult: 3.0,
    heatMultiplier: 5.0,
  };

  world.compileEmitter[fabId] = {
    throughputWeight: 1,
    cohesionWeight: 0.6,
  };

  // ---------------------------------
  // Spawn starting drones
  // ---------------------------------

  const baseBehavior = getBaseBehaviorProfile(swarm);

  const startHaulers =
    1 + swarm.startingSpecialists.hauler;    // meta may add
  const startBuilders =
    1 + swarm.startingSpecialists.builder;   // meta may add
  const startMaintainers =
    0 + swarm.startingSpecialists.maintainer;

  // small helper for spawning a drone
  function spawnDrone(role: DroneBrain["role"], x: number, y: number) {
    const dId = makeEntity(world, "Drone");

    world.position[dId] = { x, y };

    world.inventory[dId] = {
      capacity: 5,
      contents: {},
    };

    world.droneBrain[dId] = {
      role,
      state: "idle",
      cargo: { resource: null, amount: 0 },
      battery: 1,
      targetEntity: null,
      behavior: {
        ...baseBehavior,
        // tweak builder range for builder drones so they feel special
        buildRadius:
          role === "builder"
            ? baseBehavior.buildRadius + 2
            : baseBehavior.buildRadius,
      },
    };

    // Drones generate almost no heat by themselves, we can skip HeatSource.
    world.powerLink[dId] = {
      demand: 0.1,
      priority: 0,
      online: true,
    };
  }

  for (let i = 0; i < startHaulers; i++) {
    spawnDrone("hauler", 32, 32);
  }
  for (let i = 0; i < startBuilders; i++) {
    spawnDrone("builder", 32, 32);
  }
  for (let i = 0; i < startMaintainers; i++) {
    spawnDrone("maintainer", 32, 32);
  }

  // world is ready
  return world;
}
```

Highlights:

* `createWorld` uses `bio` and `swarm` upgrades to control:

  * starting heatSafeCap
  * initial extractor tier
  * drone roles & behaviors
* This guarantees runs 2+ feel juiced immediately after prestige.

Later we’ll also:

* expand initial radius (bio.startingRadius) so building placement isn’t locked to tiny 5x5 early
* inject starting TissueMass or Components into Core inventory so you can build earlier
* add initial cooling veins if upgraded

But this is a solid baseline.

---

## 3. `uiSnapshotSystem(world)`

We do not want React to diff the entire ECS world 60x/sec. Instead, each sim tick we compute a distilled “UI snapshot” and store it in Zustand (or a derived ref) so React re-renders off that.

The snapshot should answer:

* What do I show in TopBar?
* What’s the list of entities to draw in FactoryCanvas right now?
* What bottleneck warnings should AIPanel display?
* What phase are we in (1/2/3)?

Here’s a first pass:

```ts
// src/ecs/systems/uiSnapshotSystem.ts

import { World } from "../world/World";
import { getCompileShardEstimate } from "../../sim/balance";
import { useGameStore } from "../../state/store";

// This structure is what React components read.
// Keep it cheap, serializable, and stable shape.
export interface UISnapshot {
  // TopBar
  heatCurrent: number;
  heatSafeCap: number;
  heatRatio: number;
  powerAvailable: number;
  powerDemand: number;
  throughput: number; // atoms/sec processed last tick (we can smooth)
  projectedShards: number;

  // Phase info
  currentPhase: 1 | 2 | 3;
  simTimeSeconds: number;

  // BottomBar buttons
  overclockEnabled: boolean;
  canFork: boolean;
  canPrestige: boolean;

  // Right panel diagnostics
  bottlenecks: string[]; // human-readable "Assembler #12 starved 40%"

  // Renderables for FactoryCanvas
  drones: Array<{
    id: number;
    x: number;
    y: number;
    role: string;
  }>;
  buildings: Array<{
    id: number;
    x: number;
    y: number;
    type: string;
    tier?: number;
    online?: boolean;
    heat?: number;
  }>;
}

export function uiSnapshotSystem(world: World) {
  // Derive some stats:
  const heatCurrent = world.globals.heatCurrent;
  const heatSafeCap = world.globals.heatSafeCap;
  const heatRatio = heatSafeCap > 0 ? heatCurrent / heatSafeCap : 0;

  const powerAvailable = world.globals.powerAvailable;
  const powerDemand = world.globals.powerDemand;

  // throughput:
  // we assume compileScoringSystem tracked a "throughputThisTick"
  // or we track moving average throughput in world.globals.peakThroughput?
  // For now we'll approximate with peakThroughput as placeholder.
  const throughput = world.globals.peakThroughput;

  // We'll need meta for shard calc multiplier:
  const state = useGameStore.getState();
  const yieldMult = state.compilerOptimization.compileYieldMult;

  const projectedShards = getCompileShardEstimate({
    peakThroughput: world.globals.peakThroughput,
    cohesionScore: world.globals.cohesionScore,
    stressSecondsAccum: world.globals.stressSecondsAccum,
    yieldMult,
  });

  // Determine phase
  // naive rule: Phase 1 < 5min, Phase 2 until overclockEnabled unlocked, Phase 3 once overclock on
  // We'll later replace this with explicit unlocking logic stored in run slice.
  let currentPhase: 1 | 2 | 3 = 1;
  if (world.globals.simTimeSeconds > 5 * 60) currentPhase = 2;
  if (world.globals.overclockEnabled) currentPhase = 3;

  // Check control availability
  const canFork = currentPhase >= 2; // after logistics unlock
  const canPrestige = currentPhase === 3; // once meltdown is looming

  // Bottlenecks:
  // Eventually, compileScoringSystem or demandPlanningSystem can annotate "starved" flags.
  // Stub: none for now.
  const bottlenecks: string[] = [];

  // Renderable drones
  const drones = Object.entries(world.droneBrain).map(([idStr, brain]) => {
    const id = Number(idStr);
    const pos = world.position[id];
    return {
      id,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      role: brain.role,
    };
  });

  // Renderable buildings
  const buildings = Object.entries(world.entityType)
    .filter(([_, t]) => t !== "Drone")
    .map(([idStr, type]) => {
      const id = Number(idStr);
      const pos = world.position[id];
      const prod = world.producer[id];
      const plink = world.powerLink[id];
      const hsrc = world.heatSource[id];

      return {
        id,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
        type,
        tier: prod?.tier,
        online: plink?.online ?? true,
        heat: hsrc?.heatPerSecond ?? 0,
      };
    });

  // Build final snapshot struct
  const snapshot: UISnapshot = {
    heatCurrent,
    heatSafeCap,
    heatRatio,
    powerAvailable,
    powerDemand,
    throughput,
    projectedShards,

    currentPhase,
    simTimeSeconds: world.globals.simTimeSeconds,

    overclockEnabled: world.globals.overclockEnabled,
    canFork,
    canPrestige,

    bottlenecks,

    drones,
    buildings,
  };

  // Push snapshot into Zustand so React can consume it.
  // We'll store it in run slice as derived view, not canonical sim state.
  useGameStore.setState({
    projectedCompileShards: projectedShards,
    currentPhase,
    // anything else we mirror in run slice for UI convenience
  });

  // Optionally we can also keep the whole snapshot in a dedicated field
  // like useGameStore.setState({ uiSnapshot: snapshot });
  // but that means Zustand rerendering whenever snapshot changes.
  // Alternative: keep snapshot in a ref outside Zustand and read via a hook.
  // For now let's just assume we do put it in state:

  useGameStore.setState({
    uiSnapshot: snapshot as any, // add uiSnapshot?: UISnapshot to RunSlice if you want this
  });
}
```

What this gives you:

* Every tick, the sim calls `uiSnapshotSystem(world)`
* That computes all high-level UI info in one pass
* React panels (`TopBar`, `FactoryCanvas`, etc.) just read `useGameStore(state => state.uiSnapshot)` and render

Later improvement: we can throttle updates to UI (e.g. only update snapshot 10x/sec instead of every tick) to avoid React thrash.

---

## How these three pieces fit together

**Game start / prestige:**

* On prestige, `useGameStore.getState().prestigeNow()`:

  * Uses `getCompileShardEstimate(...)` + `compilerOptimization.compileYieldMult`
  * Adds shards to `compileShardsBanked`
  * Increments `totalPrestiges`
  * Calls `createWorld(metaUpgrades)` with updated meta to generate a brand new `world`
  * Resets run slice values, keeps meta slice

**Game loop (each frame / fixed dt):**

```ts
// pseudocode in simLoop.ts
function gameTick(dt: number) {
  const { world } = useGameStore.getState();

  tickWorld(world, dt);
  uiSnapshotSystem(world);

  // requestAnimationFrame(...) or fixed timestep scheduling, etc.
}
```

**React render path:**

* `TopBar` pulls heatRatio, projectedShards, throughput from `state.uiSnapshot`
* `BottomBar` pulls currentPhase, canFork, canPrestige, overclockEnabled
* `FactoryCanvas` pulls `drones[]` and `buildings[]` from `uiSnapshot` and renders them

---

## What you can do next (no more design blockers)

We’re in a buildable state now:

* We have:

  * balance helpers
  * world bootstrap from meta
  * sim tick order
  * ui snapshot bridge
  * zustand slices

We can now start writing actual code.

Next concrete step I can take for you, immediately:

* Draft first pass of `tickWorld.ts` with empty system stubs (functions that mutate world in order, even if logic is TODO)
* Draft `TopBar.tsx`, `FactoryCanvas.tsx`, and `BottomBar.tsx` skeletons wired to `useGameStore` and `uiSnapshot`

That would give you a runnable shell app that:

* boots a world,
* runs a dummy loop,
* shows basic stats and renders “drones” and “buildings” as rectangles/circles in a canvas div.

If you want that, I’ll generate those stubs next as full TSX/TS modules.
