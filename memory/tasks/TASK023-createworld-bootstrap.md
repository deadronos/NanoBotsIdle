# TASK023 - Implement `createWorld(meta)` bootstrap

**Status:** Completed
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement `src/ecs/world/createWorld.ts` according to `01-technical-drafts.md` so runs can be created from `meta` upgrades.

## Thought Process
Define world shape and component stores, then implement entity factories to spawn Core and starting buildings/drones based on `meta`. Add tests to verify inventories and entity counts.

## Implementation Plan
- [x] Step 1: implement world shape and component stores
- [x] Step 2: implement entity factories and spawn logic
- [x] Step 3: unit tests validating created world
- [x] Step 4: documentation / memory updates

## Progress Log
- 2025-11-01: Implemented meta-aware `createWorld` bootstrap with helper utilities and optional empty world creation.
- 2025-11-01: Added unit coverage for bootstrap and adjusted existing system tests to use the new spawn toggle; documented task completion.

## Acceptance Criteria
- createWorld(meta) produces a valid World object with Core and starting entities matching meta parameters
