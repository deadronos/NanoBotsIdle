# [TASK002] - Centralize terrain & constants

**Status:** In Progress  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Original Request

Identify duplicate logic across files and extract into smaller helper files; cleanly separate game/sim logic and rendering. Specifically: centralize terrain generation + shared constants and ensure Player collision uses same terrain logic as World generation.

## Thought Process

This is a focused, low-risk refactor with high impact: making terrain logic (height, color, value) a single source of truth prevents physics/visual mismatches and reduces duplication. It also opens the door for a clean sim/render split later (move sim to `src/sim/*`, keep render helpers in `src/render/*`). We'll implement in small, tested steps to avoid regressions.

## Implementation Plan

1. Add `src/constants.ts` and export constants used across `World.tsx` and `Player.tsx` (e.g., `BASE_SEED`, `PRESTIGE_SEED_DELTA`, `WORLD_RADIUS`, `WATER_LEVEL`, `PLAYER_HEIGHT`, physics values).  
2. Add `src/sim/terrain.ts` with pure functions: `getSeed(prestigeLevel)`, `computeVoxel(x,z,seed)`, `getSurfaceHeight(x,z,seed)`, `getSmoothHeight(x,z,seed)`.  
3. Add `tests/terrain.test.ts` to assert determinism and range assertions for a sample grid.  
4. Update `src/components/World.tsx` to use `computeVoxel` (replace inline noise math) and `src/render/instanced.ts` helper for matrix/color updates.  
5. Update `src/components/Player.tsx` to use `getSurfaceHeight` and `WATER_LEVEL` from constants (remove duplicated noise math).  
6. Replace repeated instance update logic with `src/render/instanced.ts` helpers for `World`, `Particles`, and `Drones` where appropriate.  
7. Add integration test `tests/world-player-integration.test.ts` asserting player collisions match generated voxel heights for sample coords.  
8. Run `npm run lint`, `npm run typecheck` and `npm test`. Fix any issues.  
9. Prepare a short PR with the design doc, the task file, tests, and a summary for reviewers.

## Subtasks

| ID  | Description | Status | Updated | Notes |
|---|---|---:|---|---|
| 2.1 | Create `src/constants.ts` and export constants | In Progress | 2025-12-29 | Start by moving magic numbers used in `World.tsx` and `Player.tsx` into constants. |
| 2.2 | Implement `src/sim/terrain.ts` with `computeVoxel`/`getSurfaceHeight` | Not Started | - | Keep functions pure and deterministic; add small inline docs and types. |
| 2.3 | Add `tests/terrain.test.ts` (unit tests) | Not Started | - | Test determinism and expected ranges for a handful of coordinates. |
| 2.4 | Update `src/components/World.tsx` to use `computeVoxel` | Not Started | - | Replace inline math and ensure visual parity. |
| 2.5 | Update `src/components/Player.tsx` to use `getSurfaceHeight` & `WATER_LEVEL` | Not Started | - | Validate player no longer sinks; add small integration assertions. |
| 2.6 | Create `src/render/instanced.ts` helpers and replace duplicated instance updates | Not Started | - | Reuse `Object3D` for matrices and centralize `needsUpdate` logic. |
| 2.7 | Replace repeated instance/color update sites (Particles, World, Drones) | Not Started | - | One-by-one replacement with testing/visual verification after each. |
| 2.8 | Integration tests and CI checks | Not Started | - | Add `tests/world-player-integration.test.ts` and ensure CI passes. |
| 2.9 | PR & review | Not Started | - | Include design doc and tests; provide migration notes. |

## Progress Log

### 2025-12-29
- Created design doc `DESIGN002-centralize-terrain-and-constants.md`.  
- Created this task file `TASK002-centralize-terrain-and-constants.md` and marked **In Progress**.  
**Next action:** implement `src/constants.ts` and `src/sim/terrain.ts`, then add `tests/terrain.test.ts`.

## Acceptance Criteria

- `World` and `Player` share the same terrain math (verified via unit + integration tests).  
- `WATER_LEVEL` and `PLAYER_HEIGHT` are used from `src/constants.ts` for both water rendering and swim/physics calculations.  
- No remaining duplicated ad-hoc `noise2D` biasing logic for surface height in `World` or `Player`.  
- Tests pass (`npm test`), lint/typecheck are green, and visual regressions are absent.

## Risk & Mitigation

- If surface values shift slightly after refactor, adjust constants in `src/sim/terrain.ts` and keep compatibility tests to ensure regressions are visible immediately.  
- Keep changes small and add tests before modifying production callers where possible.

## Design Link

- See `memory/designs/DESIGN002-centralize-terrain-and-constants.md` for architecture and acceptance criteria.

---
