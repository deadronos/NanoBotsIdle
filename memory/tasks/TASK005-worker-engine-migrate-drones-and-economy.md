# [TASK005] - Worker Engine Migration (Drones + Economy + UI Snapshot)

**Status:** In Progress  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Original Request
Move simulation/game logic out of R3F components and Zustand into a TypeScript engine (hosted in a Web Worker) so rendering becomes an adapter that applies deltas and UI becomes a read model.

## Thought Process
Once `TASK004` provides a Worker bridge and a stable protocol, we can start migrating real gameplay without changing rendering tech immediately:

- Keep world rendering as instanced cubes initially.
- Replace `WorldApi` and per-frame drone simulation with Worker-driven deltas.
- Move economy + upgrade costs into the engine so UI cannot drift from sim truth.

This is the “big decoupling” step: `Drones.tsx` becomes render-only and `src/store.ts` becomes UI-only.

References:
- `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- `docs/ARCHITECTURE/GAME001-progression-loop.md`
- `memory/designs/DESIGN004-worker-authoritative-sim-engine-refactor.md`

## Implementation Plan
- Engine systems (Worker side):
  - Add drone sim system (positions/targets/mining timers).
  - Add economy system (credits, upgrades, next-cost computation).
  - Add prestige command handling (regenerate seed/state).
  - Emit `UiSnapshot` each step (credits, prestige, droneCount, upgrades, nextCosts).
- Protocol expansion:
  - Add/confirm `Cmd` types: `BUY_UPGRADE`, `PRESTIGE`, `CLICK_VOXEL` (even if click mining is stubbed).
  - Decide drone pose encoding (start with arrays; switch to packed `Float32Array` when stable).
- Main thread adapters:
  - Replace `src/store.ts` with `src/ui/store.ts` (Zustand read model).
  - Update `src/components/UI.tsx` to read `UiSnapshot` and dispatch commands.
  - Replace `src/components/Drones.tsx` simulation with a render adapter driven by `delta.entities`.
  - Replace `src/components/World.tsx` imperative API with `applyDelta()` updates (temporary render strategy).

## Progress Tracking
**Overall Status:** In Progress - 75%

### Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 5.1 | Implement engine economy + upgrades + `UiSnapshot` | Complete | 2025-12-29 | Engine now owns credits, upgrades, prestige, mined/total counts, and nextCosts. |
| 5.2 | Implement engine drone sim + pose delta output | Complete | 2025-12-29 | Worker now simulates drones and emits positions + mined events. |
| 5.3 | Add `Cmd` handling for shop + prestige | Complete | 2025-12-29 | Added `BUY_UPGRADE`, `PRESTIGE`, `MINE_BLOCK`, `SET_TOTAL_BLOCKS`. |
| 5.4 | Add `src/ui/store.ts` as UI read model | Complete | 2025-12-29 | UI snapshot stored via `useUiStore`. |
| 5.5 | Refactor `UI.tsx` to dispatch commands | Complete | 2025-12-29 | UI uses `UiSnapshot` + `nextCosts`; sends commands via sim bridge. |
| 5.6 | Refactor `Drones.tsx` to render-only | Complete | 2025-12-29 | Drones now render from worker delta positions; mining effects driven by mined events. |
| 5.7 | Refactor `World.tsx` to consume voxel edit deltas | Not Started | - | Remove `WorldApi` usage. |

## Progress Log

### 2025-12-29
- Created TASK005 with an implementation plan.
- Moved economy/upgrade logic into the engine and extended `UiSnapshot`.
- Added UI read model store and updated UI, World, Drones, and Player to consume it.
- Bridged mining rewards/total blocks to the engine via commands.
- Moved drone simulation into the engine and switched drone rendering to use worker deltas.
- World now streams a target pool to the worker and applies mined indices from sim deltas.

## Design Link
- `memory/designs/DESIGN004-worker-authoritative-sim-engine-refactor.md`
