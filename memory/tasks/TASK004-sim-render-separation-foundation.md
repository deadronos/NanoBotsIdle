# [TASK004] - Sim/Render Separation Foundation (Engine + Protocol + Worker Bridge)

**Status:** Pending  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Original Request
Create a clean separation of simulation and rendering for NanoBotsIdle, keeping everything in TypeScript for now, and moving the engine/sim into a Web Worker with a clear command/delta protocol. The architecture should be resumable via docs-first planning.

## Thought Process
This task lays the “spine” for the refactor described in:

- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- `memory/designs/DESIGN004-worker-authoritative-sim-engine-refactor.md`

If we get the protocol + gating + worker plumbing right early, all subsequent refactors become mechanical: move logic behind `Engine.dispatch()` / `Engine.tick()` and stop importing engine state directly from render/UI code.

This also aligns with the repo’s worker guidance (`js-worker-multithreading` skill): keep the worker pure, reuse a single worker, and prevent backlog with strict gating.

## Implementation Plan
- Define message protocol types in `src/shared/protocol.ts` (no Three/Zustand types).
- Implement `src/engine/engine.ts`:
  - `createEngine(seed?)`
  - `dispatch(cmd)`
  - `tick(dtSeconds, budgetMs, maxSubsteps)` returning empty/skeleton deltas for now.
- Implement `src/worker/sim.worker.ts` as a thin adapter:
  - `INIT` → create engine
  - `STEP` → dispatch cmds → tick → post `FRAME`
  - on exception → post `{t:"ERROR"}` and stop stepping
- Implement `src/simBridge/simBridge.ts` (main thread):
  - spawn worker once
  - queue cmds
  - gate so only one `STEP` is in flight
  - expose a subscription/callback for `FRAME` messages
- Add a minimal integration in app startup (logging stats) without changing gameplay yet.
- Add unit tests for:
  - protocol payload constraints (no class instances / Vector3 in messages)
  - simBridge gating behavior (never more than one `STEP` in flight)

## Progress Tracking
**Overall Status:** Not Started - 0%

### Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 4.1 | Add `src/shared/protocol.ts` | Not Started | - | Mirror `TECH001` shapes; keep serializable. |
| 4.2 | Add `src/engine/engine.ts` skeleton | Not Started | - | Pure TS, no worker knowledge. |
| 4.3 | Add `src/worker/sim.worker.ts` adapter | Not Started | - | INIT/STEP/FRAME/ERROR. |
| 4.4 | Add `src/simBridge/simBridge.ts` | Not Started | - | Command queue + step gating. |
| 4.5 | Wire simBridge into app (no gameplay change) | Not Started | - | Log FRAME stats; ensure no regressions. |
| 4.6 | Add unit tests for gating + payload shapes | Not Started | - | Vitest: ensure we don’t regress into Vector3/class messages. |

## Progress Log

### 2025-12-29
- Created TASK004 with an implementation plan.

## Design Link
- `memory/designs/DESIGN004-worker-authoritative-sim-engine-refactor.md`

