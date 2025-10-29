Delicious answers.

Locking in:

* **Drones = physical pathfinding** (real movement, congestion is real, you can watch them swarm)
* **Placement vibe = mostly aesthetic / territory growth**, not a hardcore adjacency puzzle

That gives us:

* Visually satisfying emergent swarm behavior
* Low cognitive tax on layout (good for idle)
* Clear levers for prestige/meta (“smarter swarm” is literally visible)

Now I’ll deliver:

1. Simulation architecture (ECS-style)
2. Save data model (what resets vs what persists)
3. Run #1 pacing from minute 0 → ~45 min
4. How the math plugs into that pacing

After this, we’re in a position where I can sketch first-pass UI panels and state slices in React/Zustand whenever you want.

---

## 1. Core Simulation Architecture (ECS)

We’ll model this like a lightweight ECS with Systems that tick in a strict order each frame / sim step.

### 1.1 Entities

**Drone**

* `id`
* `pos` (x,y in grid coords)
* `targetPos`
* `cargo` (resource type + amount)
* `role` (Hauler / Builder / Maintainer / etc.)
* `state` (Idle / Moving / Hauling / Building / Charging)
* `battery` (if we add energy per-drone; optional early on)
* `heatContribution` (tiny but matters at scale)

**Building**

* `id`
* `pos` (grid tile)
* `type` (Extractor, Assembler, Fabricator, Storage Node, Power Vein Node, Cooler, Core Compiler, etc.)
* `inventory` (resourceName → amount)
* `inputCapacity` / `outputCapacity`
* `productionRecipe` (for assemblers)
* `active` (online/offline/faulted/overclocked)
* `heatOutput`
* `powerDraw`
* `tier`

**ResourceNode (map feature)**

* `id`
* `pos`
* `resourceType` (Carbon, Iron, Silicon…)
* `richness` (affects base_rate)
* `depleted` %

**PowerVeinSegment**

* `id`
* `path` (list of tiles this vein touches)
* `throughput`
* `overstressed` flag (goes red and pulses)

**GhostBuild (planned building not finished yet)**

* `blueprintType`
* `pos`
* `remainingConstructionCost`
* Builder drones look for these.

**FactoryCore (the “you”)**

* Global anchor entity at center
* Tracks heat, stress, compile output, etc.
* Unlocks Overclock in Phase 3

---

### 1.2 Components (data chunks on entities)

Instead of listing every component per entity, think in reusable pieces:

* `Position { x, y }`
* `Inventory { capacity, map<Resource, amount> }`
* `Producer { recipe, progress, rate }`
* `HeatSource { heatPerSecond }`
* `HeatSink { coolingPerSecond }`
* `PowerLink { demand, priority, online }`
* `HaulerBrain { behaviorProfileRef }`
* `BuilderBrain { buildRadius }`
* `TaskRequest { want: Resource X amount Y at Building Z }`
* `Path { nodes[], idx }` // for movement
* `Overclockable { safeRate, overRate, heatMult }`
* `CompileEmitter { cohesionWeight, throughputWeight }`

This makes it really easy later to add new building types without special-casing.

---

### 1.3 Systems (tick order matters)

We’ll run these every sim step in a deterministic order. (This matches the style in your ongoing “space factory” work.)

**(1) Demand Planning System**

* Buildings that are starved for inputs generate `TaskRequest`s.
* Example: Assembler needs 5 Iron → creates a request for Iron.
* Priority of each request is affected by your routing panel settings.
* Output: global task queue.

**(2) Drone Assignment System**

* Idle hauler drones look at task queue.
* They pick:

  * nearest supply building with that resource
  * nearest requester
  * OR highest-priority requester if multiple
* Writes `Path` for drone → supply → requester.

This is where “Programmable AI” lives. You upgrade heuristics here via prestige.

**(3) Pathfinding System**

* Calculates/updates grid path for each drone that needs to move.
* Basic A* or flow-field (we can talk implementation later).
* Can also inject congestion cost: tiles with many drones become “expensive,” causing emergent laneing.
* Important: this is where Swarm Cognition upgrades do their magic (better congestion avoidance).

**(4) Movement & Hauling System**

* Drones move along path.
* When reaching pickup building:

  * Transfer from building inventory → drone cargo
* When reaching dropoff building:

  * Transfer drone cargo → building inventory
  * Mark delivery task as satisfied

**(5) Production System**

* For each Producer building (Extractor, Assembler, Fabricator):

  * Check required input in inventory
  * Consume that input
  * Advance production progress
  * On completion, output product to its internal inventory

We apply the production formula here:
`output_per_sec = k * (tier^1.5) / (1 + heat_ratio)`
(where `heat_ratio = current_heat / safe_heat_cap`)

**(6) Heat & Power System**

* Sum heat from HeatSource entities
* Subtract cooling from HeatSink entities
* Update `heat_ratio`
* If `heat_ratio` passes thresholds, mark buildings as “stressed” or “melting”
* Overclock mode injects multiplier here

**(7) Compile Scoring System**

* Tracks:

  * peak_throughput (atoms/sec processed)
  * cohesion_score (how often requests are satisfied without starvation / delivery latency)
  * stress_seconds survived while overclocked
* This accumulates your future prestige payout in real time

**(8) UI Snapshot System**

* Collapses all important stats into a light state object for React:

  * totalAtomsPerSec
  * currentHeat / safeHeatCap
  * projectedShardsIfPrestigeNow
  * bottleneckHints[]
* This is what the dashboard renders.

This ECS order keeps cause/effect predictable and debuggable.

---

## 2. Save Data Model

We need two layers:

* **Run State** (wipes on Recompile Core)
* **Meta State** (persists forever)

### 2.1 Run State (reset each prestige)

* Map reveal (which tiles you’ve grown into)
* All buildings placed and their tiers
* All drones, their roles, positions, inventories
* Current inventories of resources
* Current heat, power grid status
* Active Fork Process traits for this run
* Time survived
* Score trackers for Compile Shards

This is what dies on prestige.

### 2.2 Meta State (persists across runs)

* Compile Shards (spent and unspent)
* Unlocked tiers in each meta tree:

  * Swarm Cognition tree (drone brain stuff)
  * Bio-Structure Templates tree (better starts, larger growth area, safer heat baseline)
  * Compiler Optimization tree (multiplies shard yield etc.)
* “Starting Loadout” blueprint:

  * Example: start each new run with 1 Extractor, 1 Mini Fabricator, 4 drones, pre-grown tissue radius 5
* “Behavior Modules” you’ve globally unlocked for drones

  * (e.g. predictive hauling, prefetching critical inputs)
* Cosmetic unlocks if we want (different bio-vein glow color, etc.)

### 2.3 Fork Process State (intra-run mini-prestige)

Fork is mid-run only, so:

* Fork Points
* Behavior modules chosen THIS run
* These reset on full prestige and are not stored in meta

So summary:

* Prestige = serialize Meta State only; Run State gets nuked and reinitialized from your blueprint.

---

## 3. First-Run Pacing (0 → ~45 min)

Assuming “Medium” prestige cadence (30–60 min range), here’s a first run:

### Minute 0–5: Awakening

* You start with:

  * Bare Core
  * 1 Atom Extractor node over a Carbon-rich tile
  * 1 tiny Assembler
  * 1 barebones Fabricator
  * 2 worker drones (generic role)
* UI is simple: you only see

  * Center simulation grid
  * Left panel (Build basic stuff)
  * Top bar with Heat/Power/Atoms-per-sec
* You manually place a second Extractor.
* You unlock the 3rd drone at like 2–3 minutes in via crafting Components.

Math here:

* Extractor base_rate is intentionally high so you’re not starved.
* Costs are cheap, quadratic scaling is still tiny (n=1→2 costs almost nothing).

Goal of this slice: Teach “atoms → components → drones”.

---

### Minute 5–15: Logistics annoyance begins

* Inventories start clogging.

* Drones walk dumbly: they respond to loudest need, so they keep running Carbon to Assembler even when Fabricator is starving.

* You unlock the **Routing Priorities tab** (right panel).

  * You can set “Fabricator > Assembler”
  * Immediately feels like “ohhh I’m teaching them.”

* You also unlock ghost building placement:

  * You can blueprint new structures you can’t afford yet.
  * Builder drones become a thing.
  * Fabricator can now build “Builder-role drones” specifically.

Math here:

* Drone production cost ramps quadratically: cost(n) = a*n² + b*n + c

  * So drone #2 cheap, #4 okay, #10 painful
* You feel the diminishing returns of spamming haulers without better AI.

Goal of this slice: You feel the need for smarter swarm, which is what prestige will sell you.

---

### Minute 15–25: Phase 2 unlock (Networked Logistics)

* You unlock:

  * Power Vein segments (you draw living veins to power stuff)
  * Heat stat starts mattering
  * First minor cooler
* You gain access to **Fork Process** button:

  * Sacrifice all current drones → gain Fork Points
  * Buy 1–2 behavior modules for the new generation (same run)

    * e.g. “Haulers prefetch high-priority inputs proactively”
    * e.g. “Builders auto-complete ghosts in radius even without manual command”

This is your first taste of swarm intelligence.

Visually: veins pulse, drones move in smarter patterns. Player starts to feel like they’re actually designing an organism.

Math here:

* Heat ratio starts >0 after ~20 min. This starts to throttle your throughput.
* So you’re approaching the wall that makes you think about Overclock/Phase 3.

Goal of this slice: Set up the idea that you are temporary. You will burn.

---

### Minute 25–40: Overclock (Phase 3)

* UI bottom bar now offers **OVERCLOCK MODE**.
* When you toggle it:

  * Extractors, Assemblers, Fabricator all jump production
  * Heat skyrockets
  * You start accruing **stress_seconds**
  * The Compile Shards projection in the top bar starts shooting up

Also unlocked:

* **Self-Termination Protocols**

  * You can scrap buildings or recycle drones into instant shard multipliers.
  * This creates that “bleeding the last drops” behavior at end of run.

Math here:

* Throughput during overclock ~2x–5x depending on what you’ve built
* Heat ratio feeds back into output_per_sec denominator, so you can’t go infinite
* Eventually, cooling can’t keep up
* You enter cascade failure

Goal: Give you 10-15 minutes of “ride the edge, squeeze value”. Emotional payoff.

---

### Minute ~40–50: Recompile Core (Prestige)

* Factory enters meltdown
* You hit **RECOMPILE CORE**
* Run ends and we go to meta screen

Meta Screen shows:

* Compile Shards gained
* Breakdown:

  * peak_throughput contribution
  * cohesion_score contribution
  * stress_seconds contribution
* Three upgrade trees:

  1. Swarm Cognition
  2. Bio-Structure Templates
  3. Compiler Optimization
* You buy permanent upgrades
* New run starts with:

  * a slightly stabilized heat baseline
  * maybe 1 extra pre-made drone
  * slightly larger starting tissue radius
  * etc.

Run 2 begins and goes faster.
You see immediate payoff (very important psychologically).

---

## 4. How the math supports that pacing

* **Extractor scaling:** quadratic cost keeps early growth snappy, then naturally slows around minute ~15 where bottleneck = logistics not extraction rate. Good pacing.
* **Drone usefulness:** hauling efficiency soft-cap (that `1 / (1 + (D/K)^2)` piece) creates the feeling “more drones are tripping over each other.” Perfect to sell Swarm Cognition upgrades after first prestige.
* **Heat:** Heat starts doing nothing, then becomes the core limiter, then becomes the dramatic death clock.
* **Shard formula:**
  `compile_shards = A * sqrt(peak_throughput) + B * log2(cohesion_score + 1) + C * (stress_seconds)^0.7`

  * `sqrt(peak_throughput)` means you’re rewarded for scaling big, but massive late-game factories don’t give 1000x shards
  * `log2(cohesion_score + 1)` means “smart drones matter,” which emotionally reinforces the fantasy
  * `(stress_seconds)^0.7` means “the longer you survive in Overclock under heat, the better,” but returns diminish, so runs don’t drag forever

This math produces:

* Early prestiges (run 1, 2, 3) = small shard totals but massive *qualitative* unlocks
* Later prestiges = shard multipliers, efficiency buffs, etc.

---

## Where we go next

I can now do one of two tracks with you next turn:

**Track 1: Technical scaffolding**

* ECS module list (TypeScript interfaces for Components/Systems)
* Zustand store layout (run state slice vs meta state slice)
* Proposed sim tick order code comments
* React panel / layout tree (left build panel, center sim canvas, right AI panel, bottom run controls)

**Track 2: Game design detail**

* Meta upgrade tree draft with 3–4 tiers each, concrete examples + costs
* First 10 unlocks in Run 1 (minute-by-minute milestones)
* First Fork Process behavior modules and what they actually do in code terms

You pick Track 1 (tech) or Track 2 (design) and I’ll dive straight into it.
