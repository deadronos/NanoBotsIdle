Beautiful. We're going to lock down the actual game design knobs now so we can (a) balance progression, (b) make prestige feel worth it, and (c) have concrete effects we can literally wire into code.

You’re getting:

1. Meta upgrade trees (Swarm Cognition / Bio-Structure Templates / Compiler Optimization)

   * Tiers, effects, shard cost, when they unlock
2. First 10 unlocks in Run 1 (timeline of discovery in your first ~45 min loop)
3. Fork Process behavior modules

   * What they do in-fiction
   * What they do in code / ECS terms

After this, we basically have the vertical slice loop.

---

## 1. Meta Upgrade Trees (Persistent Prestige Upgrades)

These are bought with **Compile Shards** after you hit “Recompile Core”. They permanently change how each new run starts and how smart/efficient it feels.

We’ll tune costs polynomially (5, 15, 40, 100 style). You'll usually afford Tier 1 after your first run, Tier 2 after 2–3 runs, etc.

### 1. Swarm Cognition (Drone Intelligence / Logistics Brain)

Fantasy: your next generation of drones boots with more coordination.

**Tier 1: Congestion Awareness**

* Cost: 5 Shards
* Unlock Requirement: none
* Effect:

  * Drones avoid high-traffic tiles instead of dumb straight lines.
* Code effect:

  * `behavior.congestionAvoidance = 1`
  * PathfindingSystem adds congestion penalty to `world.grid.walkCost` when computing routes for hauler drones.
* Result: fewer traffic jams, higher effective hauling rate at ~5+ drones.

---

**Tier 2: Predictive Hauling**

* Cost: 15 Shards
* Unlock Requirement: 1 total prestige
* Effect:

  * Haulers prefetch resources for high-priority buildings before they are fully starved.
* Code effect:

  ```ts
  behavior.prefetchCriticalInputs = true;
  // DemandPlanningSystem:
  // instead of generating TaskRequest only when inventory == 0,
  // now generate if inventory < lowWaterMark (e.g. < 30% desired).
  ```
* Result: Assemblers/Fabricator idle way less → cohesionScore goes up → boosts shard yield next runs.

---

**Tier 3: Specialist Seed**

* Cost: 40 Shards
* Unlock Requirement: 3 total prestiges
* Effect:

  * You start each run with:

    * +1 hauler
    * +1 builder
    * +1 maintainer
  * These are fully functional, not “ghosts.”
* Code effect:

  ```ts
  swarm.startingSpecialists = { hauler: 1, builder: 1, maintainer: 1 }
  ```

  (We already wired that into `createWorld`.)
* Result: Bootstrap goes faster, and builders auto-finish ghost structures early.

---

**Tier 4: Coordinated Dispatch**

* Cost: 100 Shards
* Unlock Requirement: 6 total prestiges
* Effect:

  * Hauler drones can batch deliveries to multiple consumers in one route instead of single source→single sink.
* Code effect:

  * DroneBrain gets a tiny internal queue:

    ```ts
    brain.multiDropQueue = [ {targetEntity, resource, amount}, ... ]
    ```
  * DroneAssignmentSystem fills multiple compatible TaskRequests into one hauler before launch.
* Result: Late-game hauling scales without adding 50 more drones.

---

### 2. Bio-Structure Templates (Starting Body / Base Stability)

Fantasy: you don’t spawn as a naked baby node anymore, you spawn as a grown bio-industrial seed.

**Tier 1: Pre-Grown Tissue Radius**

* Cost: 5 Shards
* Unlock Requirement: none
* Effect:

  * You start with a wider usable build radius around Core.
* Code effect:

  ```ts
  bio.startingRadius = 6  // default was 4
  ```

  The build UI no longer says “out of range” immediately.
* Result: Early spatial breathing room without forcing you to research expansion.

---

**Tier 2: Hardened Cooling Veins**

* Cost: 15 Shards
* Unlock Requirement: 1 prestige
* Effect:

  * Passive cooling baseline increases.
* Code effect:

  ```ts
  bio.passiveCoolingBonus += 1
  // which we mapped to:
  // world.globals.heatSafeCap = 100 + bio.passiveCoolingBonus * 20
  // and also Core gets a matching HeatSink
  ```
* Result: You survive in Phase 2/early Phase 3 longer before meltdown.

---

**Tier 3: Pre-Infused Extractor**

* Cost: 40 Shards
* Unlock Requirement: 2 prestiges
* Effect:

  * Your starting Extractor spawns at tier 2 instead of tier 1.
* Code effect:

  ```ts
  bio.startingExtractorTier = 2;
  ```

  That increases baseRate^1.5 in production math and its heatPerSecond.
* Result: You open with much higher Carbon throughput → earlier Component production → earlier drone spam.

---

**Tier 4: Seed Stockpile**

* Cost: 100 Shards
* Unlock Requirement: 5 prestiges
* Effect:

  * The Core spawns with initial inventory:

    * Components: 20
    * TissueMass: 10
  * That’s enough to immediately:

    * place a Ghost Fabricator upgrade
    * queue one or two new drones
* Code effect:

  ```ts
  core.inventory.contents.Components += 20;
  core.inventory.contents.TissueMass += 10;
  ```
* Result: First 5–10 minutes of the run basically get compressed.

---

### 3. Compiler Optimization (Prestige Efficiency / Endgame Profit)

Fantasy: you’re literally better at converting suffering into Compile Shards.

**Tier 1: Yield Multiplier**

* Cost: 5 Shards
* Unlock Requirement: none
* Effect:

  * +20% Compile Shards on prestige.
* Code effect:

  ```ts
  compiler.compileYieldMult = 1.2; // default 1.0
  ```

  Used directly in `getCompileShardEstimate(...)`.
* Result: More shards per run = faster meta snowball.

---

**Tier 2: Thermal Overdrive Tuning**

* Cost: 15 Shards
* Unlock Requirement: 2 prestiges
* Effect:

  * Overclock produces less extra heat.
* Code effect:

  ```ts
  compiler.overclockEfficiencyBonus += 1;
  // HeatAndPowerSystem uses this to reduce effective heatMultiplier
  // e.g. effectiveHeatMult = baseHeatMult * (1 - 0.1 * overclockEfficiencyBonus)
  ```
* Result: You can sit in Phase 3 (Overclock mode) longer and farm stress_seconds for shards.

---

**Tier 3: Efficient Recycling**

* Cost: 40 Shards
* Unlock Requirement: 4 prestiges
* Effect:

  * When you self-terminate drones/buildings in Phase 3 for bonus shards, you get +30% more.
* Code effect:

  ```ts
  compiler.recycleBonus = 0.3;
  // At prestigeNow(): finalShards += sacrificedValue * (1 + recycleBonus)
  ```
* Result: End-of-run cannibalization becomes a meaningful decision.

---

**Tier 4: Recursive Compile Path**

* Cost: 100 Shards
* Unlock Requirement: 7 prestiges
* Effect:

  * +1 free Fork Point at the start of every run.
* Code effect:

  ```ts
  runSlice.forkPoints += 1 at world creation
  ```
* Result: You can kick off Fork Process in Phase 2 *way* earlier, so run #7+ is dripping with smart AI basically from minute 10.

---

### Meta tree philosophy

* Tier 1 of each tree is “your next run feels immediately better.”
* Tier 2 is “stability / survivability.”
* Tier 3 is “production spike.”
* Tier 4 is “run compression / loop acceleration / compounding shards.”

This gives you “ooh I want that next tier” instead of flat +5%s forever.

---

## 2. First 10 Unlocks in Run 1 (Minute-by-minute Milestone Path)

This is how the first ~45 min session escalates. These are “you unlocked X” or “new UI tab appears” moments.

We use approximate timestamps assuming average play, not optimal speedrunning with sweatlord micro.

### Minute 0 — Awakening

* You spawn with:

  * Core
  * 1 Extractor (Carbon)
  * 1 Assembler
  * 1 Fabricator
  * 2 Drones (1 hauler, 1 builder)
* UI visible:

  * Center sim view
  * Left Build tab: [Extractor, Assembler, Fabricator, Storage]
  * Top bar: Heat / Power / Throughput
* Goal presented: “Produce Components.”

---

### Minute ~2 — First extra drone

* You’ve crafted Components → Fabricator makes one DroneFrame → you can spawn a new hauler.
* Unlock:

  * Button in BuildPanel: “Fabricate Drone”
* Psychological beat: “more agents moving = progress”.

---

### Minute ~5 — Ghost Building Placement

* You can now place buildings you can't yet afford (ghosts).
* Builder drone now auto-builds ghosts in range.
* Unlock:

  * “Ghost Mode” toggle in BuildPanel
* Code beat:

  * We start creating `GhostBuild` entities in ECS so Builder drones get jobs.

---

### Minute ~7 — Routing Priorities tab

* Right panel (AIPanel) becomes available with a simple priority list:

  * Fabricator > Assembler > Storage
* You can reorder.
* Unlock trigger:

  * Total drones >= 3
* Gameplay impact:

  * DemandPlanningSystem starts using your priority ordering to assign TaskRequests `priorityScore`.

---

### Minute ~10 — Power Veins

* You unlock ability to place Power Vein segments (basically organic cables).
* Now certain buildings require to be “linked” or they go offline.
* Visually: pulsing bio-vein lines.
* Unlock trigger:

  * You built your first 2nd Extractor or 2nd Assembler.
* This officially starts Phase 2 feel: logistics is no longer trivial.

---

### Minute ~13 — Heat meter wakes up

* UI now shows Heat as a warning color if heatRatio > ~0.4.
* Unlock:

  * Cooler structure in BuildPanel
* You’re told “stability matters.”
* This sets up Phase 3 tension.

---

### Minute ~16 — Fork Process becomes available

* Button “Fork Process” appears in BottomBar.
* Tooltip says: “Recycle all current drones to evolve swarm behaviors this run.”
* You gain Fork Points when used.
* You unlock first batch of Fork behavior modules (see section 3 below).
* Mechanical shift:

  * Up to now, you were just building. Now you can *mutate*.

---

### Minute ~20 — Diagnostics tab

* AIPanel gets new tab “Diagnostics.”
* You start getting bottleneck hints like:

  * “Assembler #1 starved 27% last 60s”
  * “Hauler congestion near Core”
* Unlock trigger:

  * After first Fork OR after total drones >= 5
* This teaches you to read the swarm.

---

### Minute ~25 — Overclock toggle appears (Phase 3 entry)

* BottomBar now shows “OVERCLOCK” switch.
* Tooltip: “Massively increase throughput, generate heat dangerously fast, increase shard yield.”
* This is the start of deliberate burn.
* World.globals.overclockEnabled can now be set true.

---

### Minute ~35 — Self-Termination Protocols

* You unlock the option to scrap buildings/drones for burst Compile Shards.
* Unlock trigger:

  * heatCurrent / heatSafeCap > 1.2 (you’re already in danger)
* This is meant to be the “milk final value before death” phase.
* After this, meltdown is inevitable and you prestige.

---

These 10 beats create a clean arc:

* 0–10 min: scale basic production + internalize hauling
* 10–20 min: logistics brain opens up, you get to act like a manager
* 20–35 min: stress economy, heat tension, mutations
* 35+: cash out, prestige

On Run 2+ the first ~10 min compress super hard because meta upgrades give you starting drones, better extractor tier, etc.

---

## 3. Fork Process (Intra-Run, Midgame Behavior Modules)

Fork Process = soft ascension inside a run.

* You kill all current drones.
* You gain Fork Points (currency only for this run).
* You spend Fork Points to unlock Behavior Modules.
* New drones you build after that fork *inherit* those modules’ behaviors.
* On full prestige (Recompile Core), these modules are lost. They’re not permanent.

We’ll define some first-wave modules. Each one changes how AI / systems behave in code.

### Module 1: Predictive Hauler

**Cost:** 1 Fork Point
**Effect in fiction:** Haulers act like a supply chain that sees the future.
**Code effect:**

```ts
behavior.prefetchCriticalInputs = true;
```

AND in DemandPlanningSystem:

```ts
// Before: create TaskRequest when inventory[neededRes] <= 0
// After:  create TaskRequest when inventory[neededRes] < desiredThreshold
// desiredThreshold could be 30% capacity or 5 units, whichever is higher.
```

Result: Assemblers/Fabricators rarely stall, boosting cohesionScore.

---

### Module 2: Builder Swarm Instinct

**Cost:** 1 Fork Point
**Effect in fiction:** Builder drones coordinate and fan out to finish construction rapidly.
**Code effect:**

```ts
behavior.buildRadius += 4;
```

AND Builder drones switch from “closest ghost only” to:

```ts
// Builder picks highest-priority ghost within buildRadius,
// not just nearest, and marks it 'claimed' so two builders
// don't work the same ghost.
```

Result: You can paint a bunch of GhostBuilds at once and drones will efficiently finalize the blueprint.

---

### Module 3: Emergency Cooling Protocol

**Cost:** 2 Fork Points
**Effect in fiction:** The swarm will actively protect the Core from meltdown.
**Code effect:**

* Whenever `world.globals.heatCurrent/world.globals.heatSafeCap > 0.9`:

  * DroneAssignmentSystem temporarily bumps priority of Cooler-related logistics (like feeding resources to Coolers if they need fuel).
  * Haulers will interrupt their current low-priority task to feed cooling.

```ts
if (heatRatio > 0.9) {
  // override TaskRequest.priorityScore for "Cooler" targets to be insanely high (0).
}
```

Result: Extends your Phase 2/early Phase 3 survival window without you micromanaging.

---

### Module 4: Cannibalize & Reforge

**Cost:** 2 Fork Points
**Effect in fiction:** Drones accept that they are biomass. 💀
**Code effect:**

* When a drone dies (or you scrap a building), part of its value goes straight into Fabricator inventory as Components or DroneFrame.

```ts
// On entity scrap:
fabricator.inventory.contents.Components += floor(scrapValue * 0.5);
```

* This speeds up post-fork rebuild of the swarm.
* It’s the in-run accelerant that lets you recover fast from Fork (since Fork killed all your drones).

---

### Module 5: Priority Surge (Overclock Synergy)

**Cost:** 3 Fork Points
**Effect in fiction:** When you flip Overclock, haulers go feral-efficient.
**Code effect:**

* While `world.globals.overclockEnabled === true`:

  * Haulers ignore non-critical tasks
  * All TaskRequests targeting Fabricator / CoreCompiler get `priorityScore = 0`
  * All other TaskRequests get deprioritized

```ts
if (world.globals.overclockEnabled) {
  if (targetEntity.type === "Fabricator" || targetEntity.type === "CoreCompiler") {
    priorityScore = 0;
  } else {
    priorityScore += 1000;
  }
}
```

Result: In Phase 3, all logistics focuses on shard-maximizing structures. This spikes peakThroughput and stressSeconds for shard payout.

---

How Fork ties into rest of the loop:

* You play “normally” for ~15–20 minutes.
* You Fork.
* You get smarter swarm behaviors for THIS timeline only.
* That lets you push deeper into overheating before collapse.
* Collapse → Recompile Core → permanent Shards → buy meta upgrades.
* Rinse.

Fork is also where you get to shape the *personality* of this particular run. One run might be “cooling survivalist,” another “overclock burst god.”

---

## Where this leaves us

We now have:

* A prestige economy with real tiers and costs
* A clear on-ramp for the first ~45 min run (including when panels/buttons unlock)
* Fork modules with exact code hooks that modify DroneBrain / Assignment / TaskRequest logic

This is enough to:

* implement UI gating logic,
* show “locked” vs “unlocked” upgrades,
* have something meaningful to spend Compile Shards and Fork Points on,
* and wire those effects directly into systems.

Next, if you want, I can generate:

* JSON data definitions for upgrades / modules (so upgrades are data-driven, not hardcoded)
* A first draft of the upgrade UI panels (left for structures/upgrades, right for AI, bottom bar for fork/overclock/prestige) as actual React component stubs that read these definitions.

That would basically be the start of content/data separation.
