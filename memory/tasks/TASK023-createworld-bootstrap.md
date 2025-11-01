# TASK023 - Implement `createWorld(meta)` bootstrap

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement `src/ecs/world/createWorld.ts` according to `01-technical-drafts.md` so runs can be created from `meta` upgrades.

## Thought Process
Define world shape and component stores, then implement entity factories to spawn Core and starting buildings/drones based on `meta`. Add tests to verify inventories and entity counts.

## Implementation Plan
- [ ] Step 1: implement world shape and component stores
- [ ] Step 2: implement entity factories and spawn logic
- [ ] Step 3: unit tests validating created world
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- createWorld(meta) produces a valid World object with Core and starting entities matching meta parameters
