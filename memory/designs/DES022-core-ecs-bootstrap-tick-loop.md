# DES022 - Core ECS bootstrap & tick loop

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #22

## Motivation / Summary
Create the foundational ECS bootstrap and deterministic tick loop so systems can be developed and tested incrementally.

## Requirements (EARS-style)
- WHEN the world is ticked, THE SYSTEM SHALL invoke systems in a documented deterministic order [Acceptance: tickWorld invokes systems in the documented order]
- WHEN developers add systems, THE SYSTEM SHALL allow no-op stubs and ordered registration for testing [Acceptance: unit test verifies systems called in order]

## High-level design
- Components involved (files, modules)
  - `src/ecs/world/tickWorld.ts`
  - No-op system stubs (DemandPlanning, DroneAssignment, Pathfinding, Movement, Production, HeatAndPower, CompileScoring, uiSnapshot)
  - Test harness for ticking world
- Data flow / interactions
  - `tickWorld(dt)` iterates registered systems in order and applies deterministic updates to world state
- Key algorithms or constraints
  - Deterministic ordering and consistent dt handling; lightweight harness to assert call ordering

## Acceptance Criteria
- tickWorld invokes systems in the documented order deterministically for given dt values
- Unit test verifies systems are called in order using the harness

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Determinism must be preserved across JS engine variations where feasible
