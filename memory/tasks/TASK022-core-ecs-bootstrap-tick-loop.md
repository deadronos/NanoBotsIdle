# TASK022 - Core ECS bootstrap & tick loop

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Create the foundational ECS bootstrap and deterministic tick loop so systems can be developed and tested incrementally.

## Thought Process
Implement `tickWorld` that invokes ordered system stubs and provide a lightweight harness to assert call ordering. Keep systems modular and registerable.

## Implementation Plan
- [ ] Step 1: implement `src/ecs/world/tickWorld.ts` and no-op system stubs
- [ ] Step 2: add harness to tick a world for N steps and record call order
- [ ] Step 3: unit tests for deterministic ordering
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- tickWorld invokes systems in the documented order deterministically for given dt values
- Unit test verifies systems are called in order using the harness
