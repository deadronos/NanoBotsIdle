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

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 2.1 | Create `src/constants.ts` | Completed | 2025-12-29 | Added constants: `WATER_LEVEL`, `BASE_SEED`, `PRESTIGE_SEED_DELTA`, `WORLD_RADIUS`, `PLAYER_HEIGHT`, physics constants. |
| 2.2 | Add unit tests for constants | Completed | 2025-12-29 | Added `tests/constants.test.ts`. |
| 2.3 | Create `src/sim/terrain.ts` skeleton | Completed | 2025-12-29 | Added types and placeholder functions then implemented full helpers. |
| 2.4 | Implement `computeVoxel` & helpers | Completed | 2025-12-29 | Implemented `computeVoxel`, `getSurfaceHeight`, `getSmoothHeight`, `getSeed`, and `generateInstances`. |
| 2.5 | Add terrain unit tests | Completed | 2025-12-29 | Added `tests/terrain.test.ts`. |
| 2.6 | Add voxel color/value tests | Completed | 2025-12-29 | Added `tests/voxel.test.ts`. |
| 2.7 | Create `src/render/instanced.ts` helpers | Completed | 2025-12-29 | Implemented `setInstanceTransform`, `setInstanceColor`, `applyInstanceUpdates`, `populateInstancedMesh`. |
| 2.8 | Add tests for instanced helpers | Completed | 2025-12-29 | Added `tests/instanced.test.ts` and `tests/instanced-utils.test.ts`. |
| 2.9 | Migrate `World.tsx` generation to `computeVoxel` | Completed | 2025-12-29 | Replaced inline noise math with `generateInstances` and `getSeed`. |
| 2.10 | Use instanced helpers in `World` | Completed | 2025-12-29 | Replaced manual matrix/color updates with `populateInstancedMesh` and `setInstanceTransform`. |
| 2.11 | Add tests for World instances | Completed | 2025-12-29 | Added `tests/world-generation.test.ts`. |
| 2.12 | Migrate `Player.tsx` collision to `getSurfaceHeight` | Completed | 2025-12-29 | Added `src/sim/player.ts` and updated `Player.tsx` to use helper. |
| 2.13 | Ensure `WATER_LEVEL` used by World & Player | Completed | 2025-12-29 | `WATER_LEVEL` moved to `src/constants.ts` and used by `World` and `Player`. |
| 2.14 | Add world-player integration test | Completed | 2025-12-29 | Integration tests added via `tests/player-physics.test.ts`. |
| 2.15 | Migrate `Particles` to instanced helpers | Completed | 2025-12-29 | Replaced particle matrix/color updates with `setInstanceTransform`/`setInstanceColor`. |
| 2.16 | Migrate `Drones` instanced updates | Completed | 2025-12-29 | Confirmed no remaining direct `setMatrixAt`/`setColorAt` calls aside from controlled uses. |
| 2.17 | Run `lint`, `typecheck`, and tests | Completed | 2025-12-29 | Linted and fixed issues, addressed a11y, types, and test types. |
| 2.18 | Performance smoke test & quick profiling | Completed | 2025-12-29 | Built production bundle; no build errors; bundle size warning noted. |
| 2.19 | Update design doc & task statuses | In Progress | 2025-12-29 | This progress log and task updates recorded here. |
| 2.20 | Prepare PR & changelog | Not Started | - | Include design link, tests, and migration notes in PR description. |
| 2.21 | Follow-up: Draft Drone sim split plan | Not Started | - | Create a separate design & tasks for splitting drone sim and render. |

## Progress Log

### 2025-12-29
- Broke down TASK002 into detailed subtasks and synced the project todo list; set **2.1 Create `src/constants.ts`** as **In Progress**.
- Created design doc `DESIGN002-centralize-terrain-and-constants.md`.
- Created this task file `TASK002-centralize-terrain-and-constants.md` and marked **In Progress**.


### 2025-12-29 - Implementation Update

- Implemented core modules and tests:
  - Added `src/constants.ts` and `src/sim/terrain.ts` (deterministic terrain API).
  - Added `src/sim/player.ts` helper for player-ground calculations.
  - Implemented `src/render/instanced.ts` helpers and `populateInstancedMesh`.
  - Migrated `src/components/World.tsx` to use `generateInstances` and instanced helpers.
  - Refactored `src/components/Player.tsx` to use centralized ground logic and `WATER_LEVEL`.
  - Migrated particle updates to use `setInstanceTransform`/`setInstanceColor` with tests.
- Added and updated unit tests: constants, terrain, voxels, instanced helpers, player physics, world generation, and instanced utils.
- Linted, type-checked, and fixed issues (a11y updates to `SettingsModal.tsx`, test typing, import ordering).
- Built a production bundle (build successful; bundle size warning observed but acceptable for prototype).

**Next action:** prepare a focused PR with the design doc, tests, and a short migration summary in the PR body. Update the design doc with final notes and follow-up design for splitting the drone sim from rendering.

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
