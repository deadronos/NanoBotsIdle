# TASK003 - UI refresh + fixed-step simulation + ECS evaluation

**Status:** In Progress  
**Added:** 2025-12-21  
**Updated:** 2025-12-21

## Original Request

Plan and execute:
- replace UI mostly with shadcn readymade components
- separate rendering and simulation; consider fixed 1/60s sim
- identify what's missing from a Minecraft-like game
- evaluate miniplex for ECS use
- consider Zustand UI state + Immer middleware

## Thought Process

- UI migration should keep pointer-lock flow intact while swapping panels/buttons to shadcn components.
- Fixed-step simulation improves determinism; render loop will interpolate to avoid jitter.
- Chunk streaming/meshing stays per-render frame to preserve existing perf caps.
- ECS (miniplex) can help organize entity systems, but voxel World + THREE objects remain outside ECS.
- Zustand remains the UI/state store; Immer is optional and only for UI slices to avoid perf hits.

## Implementation Plan

1. Update Memory Bank requirements/design/task index for this initiative.
2. Add Tailwind + shadcn setup and core UI primitives (Button, Card, etc).
3. Refactor HUD/inventory/start overlays to shadcn components while keeping layout/pointer-lock behavior.
4. Add fixed-step simulation wrapper with interpolation and bounded catch-up.
5. Add unit tests for fixed-step accumulator and interpolation.
6. Document ECS/Immer guidance and Minecraft-like feature gaps.

## Progress Tracking

**Overall Status:** In Progress - 98%

### Subtasks

| ID  | Description                                | Status       | Updated    | Notes                         |
| --- | ------------------------------------------ | ------------ | ---------- | ----------------------------- |
| 1.1 | Update Memory Bank docs/index              | Complete     | 2025-12-21 | Task file + index updated     |
| 1.2 | Shadcn/Tailwind setup + UI primitives      | Complete     | 2025-12-21 | Tailwind + shadcn core UI     |
| 1.3 | Refactor HUD/inventory/start overlays      | Complete     | 2025-12-21 | Stats/start/inventory updated |
| 1.4 | Fixed-step sim + interpolation             | Complete     | 2025-12-21 | Fixed-step + camera interp    |
| 1.5 | Fixed-step unit tests                      | Complete     | 2025-12-21 | Vitest coverage added         |
| 1.6 | ECS/Immer + feature-gap documentation      | Complete     | 2025-12-21 | Roadmap drafted               |
| 1.7 | ECS PoC + hotbar/crosshair UI migration    | Complete     | 2025-12-21 | Miniplex + Tabs/ScrollArea    |

## Progress Log

### 2025-12-21

- Created TASK003 and updated task index to track UI + sim decoupling work.
- Added Tailwind + shadcn primitives and refactored HUD/inventory/start overlays.
- Implemented fixed-step simulation with camera interpolation and added unit tests.
- Completed ECS PoC for player/time-of-day and finished hotbar/crosshair UI migration.
- Drafted Minecraft-like feature roadmap document.
