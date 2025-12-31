# [DESIGN004] Worker-Authoritative Engine (Sim/Render Separation Refactor)
**Status:** Proposed  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Summary
Refactor NanoBotsIdle into a clean split:

- **Simulation** becomes a **pure TypeScript engine** hosted in a **Web Worker** (no React, no R3F/Three, no Zustand).
- **Main thread** remains responsible for **input, player movement/collision, rendering**, and **UI**.
- Main thread sends **commands** to the Worker; Worker replies with **deltas**:
  - voxel edits / dirty chunks / effects
  - entity poses (drones)
  - `UiSnapshot` for the HUD/shop

This design operationalizes `docs/ARCHITECTURE.md` + `TECH001` and follows the repo’s worker guidance (`js-worker-multithreading` skill): keep the worker pure, gate work (no backlog), and prefer transferables for bulk data.

## References (source of truth)
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- `docs/ARCHITECTURE/DEC001-main-thread-player-collision.md`
- `docs/ARCHITECTURE/DEC002-worker-authoritative-engine.md`
- Worker skill: `.github/skills/js-worker-multithreading/SKILL.md`

## Current state (why this refactor is needed)
As of 2025-12-29, core gameplay logic is interwoven with rendering:

- `src/components/Drones.tsx` simulates drones inside `useFrame()` and mutates gameplay state (credits) directly via Zustand.
- `src/components/World.tsx` owns “what blocks exist” and exposes an imperative `WorldApi` used by drones for targeting + mining.
- `src/store.ts` mixes UI concerns (panels) with sim truth (credits/upgrades/world stats).

This makes it hard to:
- keep the main thread responsive as drone count/world complexity rises
- move CPU-heavy simulation off-thread
- keep rules consistent between player collision and the authoritative world

## Goals
- **Clean boundaries**: engine owns sim truth; main thread owns Three objects and collision resolution.
- **Worker-friendly**: pure data in/out (structured clone / transferables), no Three/DOM in the Worker.
- **No message backlog**: at most **one `STEP` in flight**; main thread gates scheduling.
- **Resumable refactor**: incremental migration steps with small, verifiable deltas.

## Non-goals (for this refactor)
- Rust/WASM (explicitly staying TS for now).
- Full chunk meshing pipeline on day 1 (we can start with instancing and evolve).
- Introducing new drone types/buildings/factory logistics (architecture should be ready, features out of scope).

## Guardrails (must hold after refactor)
- No imports of `three` (or R3F) from `src/engine/**`, `src/worker/**`, `src/shared/**`.
- No imports of Zustand from `src/engine/**`, `src/worker/**`, `src/render/**`.
- UI never mutates sim state directly:
  - UI emits `Cmd` → Worker processes → Worker emits `UiSnapshot` + deltas.

## Proposed module layout (minimal + explicit)
This mirrors the architecture docs while staying compatible with current repo patterns.

```
src/
  shared/
    protocol.ts            // Cmd + ToWorker/FromWorker + delta types (pure TS)
  engine/
    engine.ts              // createEngine(), Engine interface (pure TS)
    world/                 // world query + edits (see DESIGN005)
    systems/               // drones, economy, upgrades, prestige
    jobs/                  // optional budgeted job queue primitives
  worker/
    sim.worker.ts          // thin adapter: STEP -> engine.tick -> FRAME
  simBridge/
    simBridge.ts           // main thread driver: queues cmds, gates STEP, emits frames
  render/
    applyDelta.ts          // apply RenderDelta to Three objects (imperative)
    voxelRenderer/         // chunk/instance cache (implementation-specific)
    droneRenderer/         // instancing buffers for drones
  ui/
    store.ts               // Zustand UI read model: UiSnapshot + toggles
    commands.ts            // helpers to enqueue Cmds from UI/input
```

## Protocol & scheduling (key correctness/perf details)
Follow `TECH001`:

- Main thread sends `STEP(frameId, nowMs, budgetMs, maxSubsteps, cmds[])`.
- Worker responds with `FRAME(frameId, delta, ui, stats?)`.
- Main thread sends the next `STEP` **only after** receiving `FRAME`.

Notes:
- Keep `Cmd` payloads **plain objects only**.
- Prefer `Float32Array`/`Int32Array` for entity poses and dirty chunks once needed.
- Don’t spawn a Worker per frame; initialize once and reuse.
- Plan for failure: if worker errors, surface it and (optionally) fall back to a main-thread engine runner in dev.

## Migration strategy (lowest drama, highest safety)
This refactor is intentionally staged so the game remains playable.

### Phase 1 — Create the “spine” (protocol + bridge + empty engine)
- Add `src/shared/protocol.ts` and `src/worker/sim.worker.ts`.
- Add `src/engine/engine.ts` with a minimal `createEngine()` and `tick()` returning empty deltas.
- Add `src/simBridge/simBridge.ts` that spawns worker and gates steps.
- Wire bridge into app with logging only (no gameplay changes yet).

### Phase 2 — Move economy + upgrades into the engine (UI becomes read-only)
- Move credit accumulation and upgrade cost logic into engine systems.
- UI dispatches `BUY_UPGRADE` commands; Worker returns `UiSnapshot` (including next costs).
- Convert Zustand to a **UI read model** (store latest `UiSnapshot` + UI toggles).

### Phase 3 — Move drone logic into the engine (render-only drones on main thread)
- Engine owns drone list and behavior, emits packed positions each `FRAME`.
- Main thread renders drones via instancing/imperative transforms.
- Remove per-frame sim from `Drones.tsx` (keep only visuals/effects as render adapters).

### Phase 4 — Remove `WorldApi` and switch to voxel edit deltas
- Engine emits voxel edits (and optionally “dirty chunks”) as authoritative deltas.
- Main thread applies edits to the voxel renderer cache.
- Player collision proxy mirrors edits for consistency (per DEC001).

## Testing strategy
- Protocol:
  - runtime shape tests for serialization-friendly payloads (no classes, no Vector3)
- Engine:
  - deterministic unit tests for upgrade costs and tick evolution
- Bridge:
  - gating logic tests (never more than one `STEP` in flight)

## Risks & mitigations
- **Risk:** message backlog causing input latency.  
  **Mitigation:** strict gating; ignore attempts to send `STEP` while in-flight.
- **Risk:** accidental `three` import leaking into worker.  
  **Mitigation:** enforce via lint rule or code review guardrail.
- **Risk:** UI re-implements balance math.  
  **Mitigation:** Worker sends `nextCosts` in `UiSnapshot`.

## Follow-up design
- `memory/designs/DESIGN005-voxel-world-model-v1.md` specifies the voxel world model (true 3D digging, bedrock, frontier mining).

