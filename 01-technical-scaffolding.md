Perfect, we’re going full engineering mode 🧪

Below is a first technical scaffold for **Nanofactory Evolution** with:

1. Project structure
2. ECS core types (Entities, Components, Systems)
3. Zustand store layout (run vs meta slices)
4. Sim tick order
5. React layout / component tree

This is meant to be clean enough that we can start actually coding next step without rethinking architecture.

---

## 1. Project Structure

Matches the style you’ve been using (state/, ecs/, three/, ui/, etc.), with persistence and deterministic sim.

```text
src/
  ecs/
    components/
      Position.ts
      Inventory.ts
      Producer.ts
      HeatSource.ts
      HeatSink.ts
      PowerLink.ts
      DroneBrain.ts
      Path.ts
      Overclockable.ts
      CompileEmitter.ts
    systems/
      demandPlanningSystem.ts
      droneAssignmentSystem.ts
      pathfindingSystem.ts
      movementSystem.ts
      productionSystem.ts
      heatAndPowerSystem.ts
      compileScoringSystem.ts
      uiSnapshotSystem.ts
    world/
      World.ts           // entity registry + queries
      EntityId.ts
      createWorld.ts
      tickWorld.ts
  state/
    runSlice.ts          // per-run state (wiped on prestige)
    metaSlice.ts         // persistent state (Compile Shards, unlocks)
    selectors.ts
    actions.ts           // high-level game actions (place building, trigger fork, etc.)
    migrations.ts        // save format evolutions
    persistence.ts       // save/load from localStorage etc.
    store.ts             // Zustand create()
  sim/
    simLoop.ts           // requestAnimationFrame or fixed timestep
    balance.ts           // formulas (cost curves, throughput, shard calc)
  ui/
    AppShell.tsx
    panels/
      BuildPanel.tsx         // left
      AIPanel.tsx            // right
      BottomBar.tsx          // bottom controls
      TopBar.tsx             // global status
    simview/
      FactoryCanvas.tsx      // center visual layer (2D grid + drones)
      overlays/
        HeatOverlay.tsx
        PowerOverlay.tsx
        RoutingOverlay.tsx
  types/
    resources.ts         // enums/types for resources (Carbon, Iron, etc.)
    buildings.ts         // building types, recipes
    drones.ts            // drone roles, behaviors
    prestige.ts          // Compile Shards, trees
```

We’ll tighten some of these as we go, but this is already workable.

---

## 2. ECS Core Types

We’re doing a lightweight ECS:

* Entities are just IDs.
* Components are maps keyed by ID.
* Systems are pure functions that read world state and mutate it in a controlled order.

### 2.1 Basic world types

```ts
// ecs/world/EntityId.ts
export type EntityId = number;

// ecs/world/World.ts
export interface World {
  nextEntityId: EntityId;

  // Component stores
  position: Record<EntityId, Position>;
  inventory: Record<EntityId, Inventory>;
  producer: Record<EntityId, Producer>;
  heatSource: Record<EntityId, HeatSource>;
  heatSink: Record<EntityId, HeatSink>;
  powerLink: Record<EntityId, PowerLink>;
  droneBrain: Record<EntityId, DroneBrain>;
  path: Record<EntityId, Path>;
  overclockable: Record<EntityId, Overclockable>;
  compileEmitter: Record<EntityId, CompileEmitter>;

  // Entity metadata
  entityType: Record<EntityId, EntityType>; // "drone" | "building" | "resourceNode" | "core" | etc.

  // Global run-level stats/conditions (not per-entity)
  globals: {
    heatCurrent: number;
    heatSafeCap: number;
    powerAvailable: number;
    powerDemand: number;
    overclockEnabled: boolean;
    peakThroughput: number;
    cohesionScore: number;
    stressSecondsAccum: number;
    simTimeSeconds: number;
  };

  // Task requests waiting for haulers
  taskRequests: TaskRequest[];

  // Pathfinding grid / nav data
  grid: GridData;
}
```

### 2.2 Components

**Position**

```ts
// ecs/components/Position.ts
export interface Position {
  x: number;
  y: number;
}
```

**Inventory**

```ts
// ecs/components/Inventory.ts
export interface Inventory {
  capacity: number;
  // example: { Carbon: 120, Iron: 45 }
  contents: Record<ResourceName, number>;
}
```

**Producer (Extractors, Assemblers, Fabricator, etc.)**

```ts
// ecs/components/Producer.ts
export interface Producer {
  recipe: Recipe;            // inputs, outputs
  progress: number;          // 0..1 for current batch
  baseRate: number;          // base items per second at tier 1, no heat
  tier: number;              // 1,2,3...
  active: boolean;           // false if starved or unpowered
}
```

**HeatSource / HeatSink**

```ts
// ecs/components/HeatSource.ts
export interface HeatSource {
  heatPerSecond: number;
}

export interface HeatSink {
  coolingPerSecond: number;
}
```

**PowerLink**

```ts
// ecs/components/PowerLink.ts
export interface PowerLink {
  demand: number;       // how much power/sec needed
  priority: number;     // lower number = higher priority (0 is critical)
  online: boolean;      // set by heatAndPowerSystem
}
```

**DroneBrain**

```ts
// ecs/components/DroneBrain.ts
export type DroneRole = "hauler" | "builder" | "maintainer";

export interface BehaviorProfile {
  // knobs that prestige + fork can modify
  priorityRules: RoutingPriorityRule[]; // "Fabricator before Assembler"
  prefetchCriticalInputs: boolean;      // predictive hauling unlocked mid-run
  buildRadius: number;                  // how far builders will auto-complete ghosts
  congestionAvoidance: number;          // 0 = dumb, 1 = decent, 2 = swarm-aware
}

export interface DroneBrain {
  role: DroneRole;
  state: "idle" | "toPickup" | "toDropoff" | "building" | "maintaining";
  cargo: { resource: ResourceName | null; amount: number };
  battery: number;         // optional, can be ignored early game
  targetEntity: EntityId | null;
  behavior: BehaviorProfile;
}
```

**Path**

```ts
// ecs/components/Path.ts
export interface Path {
  nodes: { x: number; y: number }[];
  idx: number; // current waypoint index
}
```

**Overclockable**

```ts
// ecs/components/Overclockable.ts
export interface Overclockable {
  safeRateMult: number;     // 1.0 under normal mode
  overRateMult: number;     // e.g. 2.5 under overclock
  heatMultiplier: number;   // how much extra heat per output under overclock
}
```

**CompileEmitter**

```ts
// ecs/components/CompileEmitter.ts
export interface CompileEmitter {
  throughputWeight: number; // contribution to peak throughput calc
  cohesionWeight: number;   // how well this entity operates without starvation
}
```

### 2.3 Supporting Types

```ts
// types/resources.ts
export type ResourceName = "Carbon" | "Iron" | "Silicon" | "Components" | "TissueMass" | "DroneFrame";

// types/buildings.ts
export type BuildingType =
  | "Extractor"
  | "Assembler"
  | "Fabricator"
  | "Storage"
  | "PowerVein"
  | "Cooler"
  | "CoreCompiler"
  | "Core";

// A crafting recipe for Producer
export interface Recipe {
  inputs: Record<ResourceName, number>;   // consume per batch
  outputs: Record<ResourceName, number>;  // produce per batch
  batchTimeSeconds: number;
}
```

### 2.4 Task Requests (logistics layer)

This is how buildings say “hey, I need stuff” and hauler drones decide what to do.

```ts
// ecs/world/World.ts (referenced above)
export interface TaskRequest {
  requestEntity: EntityId;          // who needs it
  resource: ResourceName;
  amountNeeded: number;
  priorityScore: number;            // lower = more urgent
  createdAt: number;                // world.globals.simTimeSeconds for cohesion calc
}

// GridData: used by pathfinding / congestion
export interface GridData {
  width: number;
  height: number;
  // collision, slow tiles, danger tiles, etc.
  walkCost: number[]; // flat array or 2D, whatever
}
```

---

## 3. Zustand Store Layout

We keep 1 global store with two clearly separated slices:

* `run` slice: dies on prestige
* `meta` slice: persists

We’ll also include actions in the store for convenience, but the sim loop will mostly mutate the ECS `World`, not arbitrary React state every frame. React reads snapshots.

### 3.1 Interface sketch

```ts
// state/runSlice.ts
export interface RunSlice {
  world: World; // full ECS world for current run

  projectedCompileShards: number;
  forkPoints: number;

  // UI helper state for current run:
  selectedEntity: EntityId | null;
  currentPhase: 1 | 2 | 3; // Bootstrap / Networked / Overclock
  overclockArmed: boolean;

  // high-level actions
  placeBuilding: (type: BuildingType, x: number, y: number) => void;
  queueGhostBuilding: (type: BuildingType, x: number, y: number) => void;
  triggerFork: () => void;            // mid-run "Fork Process"
  toggleOverclock: (on: boolean) => void;
  prestigeNow: () => void;            // Recompile Core
}

// state/metaSlice.ts
export interface SwarmCognitionUpgrades {
  // persistent unlocks that affect DroneBrain.behavior defaults
  congestionAvoidanceLevel: number;     // increases path quality / reduces traffic loss
  prefetchUnlocked: boolean;            // let haulers pre-haul for critical machines
  startingSpecialists: {
    hauler: number; // start run with N haulers already active
    builder: number;
    maintainer: number;
  };
}

export interface BioStructureUpgrades {
  startingRadius: number;               // bigger initial buildable area
  startingExtractorTier: number;
  passiveCoolingBonus: number;          // increases world.globals.heatSafeCap baseline
}

export interface CompilerOptimizationUpgrades {
  compileYieldMult: number;             // multiplies final shard payout
  overclockEfficiencyBonus: number;     // reduces heatMultiplier under overclock
  recycleBonus: number;                 // % more shards from self-termination recycling
}

// state/metaSlice.ts
export interface MetaSlice {
  compileShardsBanked: number;          // unspent
  totalPrestiges: number;               // count of runs completed

  swarmCognition: SwarmCognitionUpgrades;
  bioStructure: BioStructureUpgrades;
  compilerOptimization: CompilerOptimizationUpgrades;

  spendShards: (tree: "swarm"|"bio"|"compiler", upgradeId: string) => void;
}

// state/store.ts
import { create } from "zustand";

export interface GameState extends RunSlice, MetaSlice {}

export const useGameStore = create<GameState>()((set, get) => ({
  // --- meta slice defaults ---
  compileShardsBanked: 0,
  totalPrestiges: 0,
  swarmCognition: {
    congestionAvoidanceLevel: 0,
    prefetchUnlocked: false,
    startingSpecialists: { hauler: 0, builder: 0, maintainer: 0 },
  },
  bioStructure: {
    startingRadius: 4,
    startingExtractorTier: 1,
    passiveCoolingBonus: 0,
  },
  compilerOptimization: {
    compileYieldMult: 1.0,
    overclockEfficiencyBonus: 0,
    recycleBonus: 0,
  },

  spendShards: (tree, upgradeId) => {
    // TODO real cost logic, mutate meta upgrades, decrement compileShardsBanked
  },

  // --- run slice defaults ---
  world: createWorld(/* pass meta to shape starting layout */),
  projectedCompileShards: 0,
  forkPoints: 0,
  selectedEntity: null,
  currentPhase: 1,
  overclockArmed: false,

  placeBuilding: (type, x, y) => {
    // spawn entity in world, consume resources from inventories, etc.
  },

  queueGhostBuilding: (type, x, y) => {
    // create GhostBuild entity so builder drones can finish it
  },

  triggerFork: () => {
    // kill current drones, grant forkPoints, update default DroneBrain.behavior this run
  },

  toggleOverclock: (on) => {
    const world = get().world;
    world.globals.overclockEnabled = on;
    set({ overclockArmed: on });
  },

  prestigeNow: () => {
    // 1. Calculate final shards from world.globals stats
    // 2. Add (shards * compileYieldMult) to compileShardsBanked
    // 3. Increment totalPrestiges
    // 4. Reset run slice using updated meta upgrades
    // NOTE: meta slice stays
  },
}));
```

Key point:

* `world` is mutable simulation state.
* React shouldn’t rerender every tick from `world`; instead we’ll take snapshots (see uiSnapshotSystem below).

---

## 4. Sim Tick Order (Systems)

We’ll define a single `tickWorld(world, dt)` that calls systems in strict order. This gives determinism + debuggability.

```ts
// ecs/world/tickWorld.ts
export function tickWorld(world: World, dt: number) {
  // 1. DemandPlanningSystem:
  //    Buildings that need inputs create TaskRequests with priorityScore
  demandPlanningSystem(world, dt);

  // 2. DroneAssignmentSystem:
  //    Idle haulers pick tasks from TaskRequests
  //    They claim task(s) and set targetEntity, cargo intent
  droneAssignmentSystem(world, dt);

  // 3. PathfindingSystem:
  //    For drones with new targets, compute/refresh Path
  //    Uses world.grid.walkCost including congestion hints
  pathfindingSystem(world, dt);

  // 4. MovementSystem:
  //    Move drones along Path, transfer cargo on arrival, mark tasks fulfilled
  movementSystem(world, dt);

  // 5. ProductionSystem:
  //    Extractors/Assemblers/Fabricators:
  //    - consume inputs from Inventory
  //    - advance recipe.progress
  //    - produce outputs into Inventory
  //    Apply throughput formula:
  //      output/sec = k * (tier^1.5) / (1 + heatRatio)
  productionSystem(world, dt);

  // 6. HeatAndPowerSystem:
  //    - Sum heat from HeatSource - HeatSink
  //    - Update world.globals.heatCurrent
  //    - Compute heatRatio = heatCurrent / heatSafeCap
  //    - Track overclock stressSecondsAccum if overclockEnabled
  //    - Mark buildings on/offline based on powerLink + demand priority
  heatAndPowerSystem(world, dt);

  // 7. CompileScoringSystem:
  //    - Update peakThroughput
  //    - Update cohesionScore (shortage frequency, delivery latency)
  //    - Update projected shards for prestige
  compileScoringSystem(world, dt);

  // 8. UISnapshotSystem:
  //    - Produce a lightweight read-only snapshot for React
  //      (throughput, heat %, projected shards, bottleneck hints)
  //    - Store it somewhere React can poll (e.g. in Zustand or a derived selector)
  uiSnapshotSystem(world);
}
```

Notes:

* The **polynomial scaling** for cost/upgrades lives in `balance.ts`.
* Overclock just flips `world.globals.overclockEnabled = true` and ProductionSystem/HeatSystem read that and apply multipliers from `Overclockable` components.
* Congestion-aware pathfinding quality can increase via Swarm Cognition prestige. That’s literally upgrading AI intelligence.

---

## 5. React Layout / Components

We’ll build a dashboard UI with:

* Top global status bar
* Left: build/upgrade/fork panel
* Center: live sim view (grid, drones, veins, heat overlay)
* Right: AI / logistics / swarm brain panel
* Bottom: phase / overclock / prestige controls

### Component Tree Sketch

```text
<AppShell>
  <TopBar />            // heat, throughput, projected shards, etc.

  <main class="main-layout">
    <aside class="left-panel">
      <BuildPanel />
    </aside>

    <section class="center-sim">
      <FactoryCanvas />       // renders the grid + entities
      <HeatOverlay />         // optional toggle
      <PowerOverlay />        // optional toggle
      {/* later: routing overlay, bottleneck highlight */}
    </section>

    <aside class="right-panel">
      <AIPanel />             // routing priorities, swarm behavior, diagnostics
    </aside>
  </main>

  <BottomBar />         // phase indicator, overclock toggle, fork button, prestige button
</AppShell>
```

### TopBar

Shows core run health:

* Heat / capacity
* Power available vs demanded
* Atoms/sec throughput
* Projected Compile Shards if you prestige right now

Data source: `uiSnapshotSystem` output.

### BuildPanel (left)

Tabs:

* **Structures** (Extractor, Assembler, Fabricator, Cooler, Vein Segment, Storage)
* **Upgrades** (increase tier, quadratic cost curve)
* **Fork Process** UI

  * Sacrifice drones → gain forkPoints → choose behavior modules for *this run only*

Build flow:

* Click structure
* Click tile in FactoryCanvas
* That creates a GhostBuild entity → builder drones handle it

### FactoryCanvas (center)

* Renders:

  * Tiles (bio-substrate, veins, resource nodes)
  * Buildings (with tier info)
  * Drones (moving along paths in world)
  * Subtle heat glow overlay when stressed
* Click entity → updates `selectedEntity` in Zustand so side panels can show details

This is the “it feels alive” part.

### AIPanel (right)

Tabs:

1. **Routing Priorities**

   * “Fabricator > Assembler > Storage”
   * These weights directly influence TaskRequest.priorityScore
2. **Swarm Behaviors**

   * Global sliders/checkboxes
   * e.g. “Prefetch critical inputs” toggle (locked until Fork or prestige upgrade)
   * “Builder range” tweak (capped by upgrades)
3. **Diagnostics**

   * Bottleneck feed
   * “Assembler #12 starved 40% last 60s”
   * “Haulers overloaded near Core (congestion 85%)”
   * Handy not just for the player but for balancing

### BottomBar

* Shows current Phase (1 / 2 / 3)
* Big “OVERCLOCK” toggle when Phase 3 is unlocked
* “TRIGGER FORK” button (mid-run mini-prestige)
* “RECOMPILE CORE” button (full prestige)
* Run time

We’ll gate which buttons are enabled based on phase / heat thresholds.

---

## Summary of what’s now defined

* ✅ Folder / module structure
* ✅ ECS model (Entities, Components, World, Systems)
* ✅ Zustand layout with run slice + meta slice
* ✅ Deterministic tick order
* ✅ Dashboard React shell

What’s missing (and I can do next without asking you more questions):

* Detailed `balance.ts` formulas (extractor cost curve, throughput calc, shard calc in code)
* Initial `createWorld(meta)` bootstrapping logic (how we use meta upgrades to seed a new run)
* First version of `uiSnapshotSystem(world)` return shape so UI can read it in one go

If you’re good with the scaffolding above, I’ll draft those next: actual TS interfaces for `balance.ts`, the prestige shard calculation, and the “new run spawn kit” generator that pulls from meta upgrades.





