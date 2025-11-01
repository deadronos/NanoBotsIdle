# TASK022 - Core ECS bootstrap & tick loop

**Status:** Completed
**Added:** 2025-11-01
**Updated:** 2025-11-02

## Original Request
Create the foundational ECS bootstrap and deterministic tick loop so systems can be developed and tested incrementally.

## Thought Process
Implement `tickWorld` that invokes ordered system stubs and provide a lightweight harness to assert call ordering. Keep systems modular and registerable.

## Implementation Plan
- [x] Step 1: implement `src/ecs/world/tickWorld.ts` and no-op system stubs
- [x] Step 2: add harness to tick a world for N steps and record call order
- [x] Step 3: unit tests for deterministic ordering
- [x] Step 4: documentation / memory updates

## Progress Log
- 2025-11-02: Created ECS world scaffolding, deterministic tick loop, and recording harness. Added unit tests for tick order and time accumulation.
- 2025-11-02: Attempted `npm test`; blocked by missing Rollup optional dependency in the environment.
- 2025-11-02: Installed optional Rollup binary and ran `npm test -- --run` (threads pool) successfully.

## Acceptance Criteria
- tickWorld invokes systems in the documented order deterministically for given dt values
- Unit test verifies systems are called in order using the harness
