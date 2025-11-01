Game Loop & Systems - NanoBotsIdle

This document describes the simulation (game) loop, the intended responsibilities and ordering of systems, component access patterns, and guidance for adding or debugging systems in the codebase.

Overview

- The authoritative game state is the `World` object stored in the game store.
- A single simulation loop advances the world in discrete time steps (ticks) driven by the browser `requestAnimationFrame` loop.
- Systems run synchronously in a deterministic order once per tick and operate by reading/modifying the `World` component stores.

Key files

- Sim loop: `src/sim/simLoop.ts:9` — drives time, computes `dt`, calls `tickWorld`, updates UI snapshot, and auto-saves.
- Tick runner: `src/ecs/world/tickWorld.ts:12` — runs systems in the configured order each tick.
- World shape: `src/ecs/world/World.ts:28` — defines component stores, globals, and `taskRequests`.
- World creation: `src/ecs/world/createWorld.ts:58` — builds initial entities and seed state.

Game Loop (high level)

1. Browser calls `requestAnimationFrame(loop)`. The loop computes `dt` (seconds), capped to prevent huge jumps.
2. The sim loop obtains the game `state` from the store and calls `tickWorld(state.world, dt)`.
3. `tickWorld` runs systems in a fixed order. Systems read and write component maps on `world`.
4. After systems run, the sim loop calls `state.updateUISnapshot()` so the UI renders a derived snapshot without reading the live world every frame.
5. Periodic autosave is invoked by the sim loop (default: every 30s).

System Ordering & Rationale

- Systems must run in a consistent, deterministic order so side-effects happen predictably.
- Current order (see `tickWorld`) is intentionally chosen to satisfy dependencies and data flow:
  1. `unlockSystem` — detect and apply progression/unlocks before other systems rely on unlocked features
  2. `congestionSystem` — measure congestion metrics so pathfinding can incorporate them
  3. `demandPlanningSystem` — examine producers' inventories and produce `taskRequests` (requests for haulers)
  4. `droneAssignmentSystem` — assign idle haulers to tasks created by planning
  5. `pathfindingSystem` — compute drone paths (reads world grid and congestion data)
  6. `movementSystem` — advance entities along paths and perform pickups/dropoffs
  7. `productionSystem` — progress producers, consume inputs, create outputs (depends on inventory & online status)
  8. `heatAndPowerSystem` — compute power connectivity, online/offline states, heat accumulation, and stress
  9. `compileScoringSystem` — calculate scoring metrics using throughput/cohesion/stress

System Responsibilities (guiding rules)

- Each system should have a narrow, well-documented responsibility (e.g., pathfinding only computes paths).
- Systems should read from component stores and write to component stores of their concern. Avoid duplicating authoritative data elsewhere.
- Systems may create or remove components (for example `world.path[entity]` set/cleared by pathfinding and movement systems).
- Side effects that cross systems should be communicated via world-level structures (e.g., `world.taskRequests`) rather than hidden globals.

Component Access Patterns

- Component stores are plain maps keyed by numeric `EntityId` (`world.inventory[id]`, `world.position[id]`).
- Common access rules:
  - Check presence: always verify a component exists before reading (`if (!world.inventory[id]) return`).
  - Use `world.entityType[id]` to decide behavior for grouped logic (power veins vs buildings, etc.).
  - Prefer updating components in place (mutate objects) — systems expect direct mutation of the `world` object.

Task Requests & Drone Flow

- `demandPlanningSystem` builds `world.taskRequests[]` based on producers' input needs.
- `droneAssignmentSystem` assigns idle haulers to tasks by setting `droneBrain.targetEntity`, `state`, and cargo intent.
- `pathfindingSystem` computes a `world.path[droneId]` (array of nodes + idx) used by `movementSystem`.
- `movementSystem` advances drones on their `path`, and on arrival performs pick-up or drop-off by mutating `world.inventory` counts.
- This queue-and-assign pattern isolates planning (what needs moving) from execution (who moves and how).

Heat & Power Considerations

- `heatAndPowerSystem` determines which entities are `connectedToGrid` and whether links are `online`.
- Heat sources and sinks update `world.globals.heatCurrent`. Overclocking multiplies heat generation.
- Producers check `world.powerLink` online status and `world.globals.heatCurrent` to influence activity.
- Cascading failures and random offline events are modeled here — failures are applied conservatively in this system only.

Determinism & Safety

- Systems run synchronously and modify the same `world` object. To keep behavior deterministic:
  - Avoid relying on iteration order of `Object.entries` where possible; if order matters explicitly, iterate sorted ids.
  - Prefer deterministic random seeds or limit use of `Math.random()` in critical deterministic paths (tests may mock randomness).
  - Keep system ordering stable — changing the order can alter outcomes.

Performance & Optimization

- UI rendering should use snapshots (`state.updateUISnapshot`) to avoid rendering directly from the mutable world.
- Heavy work (A\* pathfinding, congestion calculation) is run once per tick; consider batching or reducing frequency for large worlds.
- Use simple guards to skip work (e.g., if a drone already has a `world.path[id]`, skip re-running A\*).

Testing & Debugging

- Unit tests exist under `src/test/` for systems like production, pathfinding, and power. Add tests when you change behavior.
- To debug a system locally:
  - Create a minimal `World` instance using `createWorld()` and adjust component values.
  - Call `tickWorld(world, dt)` with a deterministic `dt` and inspect component changes.
- When testing random failure behavior, inject deterministic randomness (mock `Math.random`) or expose failure chance calculators.

How to Add a New System (Checklist)

1. Add a single-file system under `src/ecs/systems/` and export a function that takes `(world: World, dt: number)`.
2. Keep responsibility focused and document inputs/outputs.
3. Prefer communicating via components or existing queues (e.g., `taskRequests`) instead of creating new global state unless needed.
4. Add the system to `tickWorld.ts` in the correct position relative to dependencies.
5. Add unit tests to `src/test/` that create a small `World`, run `tickWorld` for a few ticks, and assert expected state changes.
6. Run tests and ensure deterministic results.

Common Pitfalls

- Mutating arrays while iterating them (e.g., shifting `world.taskRequests` while also iterating) — be explicit about intended semantics.
- Relying on side effects across systems without an explicit contract (use structured queues/components for communication).
- Running expensive pathfinding for every drone every tick — cache or skip when paths remain valid.

Appendix — Quick File References

- Sim loop: `src/sim/simLoop.ts:9`
- Tick runner: `src/ecs/world/tickWorld.ts:12`
- World shape: `src/ecs/world/World.ts:28`
- World creation: `src/ecs/world/createWorld.ts:58`
- Production system: `src/ecs/systems/productionSystem.ts:4`
- Heat & Power system: `src/ecs/systems/heatAndPowerSystem.ts:10`
- Drone assignment: `src/ecs/systems/droneAssignmentSystem.ts:3`
- Pathfinding & movement: `src/ecs/systems/pathfindingSystem.ts:4`, `src/ecs/systems/movementSystem.ts:5`

If you'd like, I can also:

- Add a short sequence diagram showing the flow of a single task request from planning to delivery.
- Create a checklist PR template for adding systems with test and docs steps.
