# DES026 - Pathfinding MVP (A* grid + congestion)

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #26

## Motivation / Summary
Provide a minimal A* pathfinding system with tile-level congestion cost to unblock early hauling and movement logic.

## Requirements (EARS-style)
- WHEN a route is requested, THE SYSTEM SHALL compute an A* path over the grid honoring congestion costs [Acceptance: path avoids high-cost tiles when alternative exists]
- WHEN congestion updates, THE SYSTEM SHALL expose an API to update tile costs for subsequent path computations [Acceptance: congestion layer usable by movement]

## High-level design
- Components involved (files, modules)
  - `src/ecs/systems/pathfindingSystem.ts`
  - Congestion cost layer and debug overlay
- Data flow / interactions
  - Pathfinding requests consult congestion layer; results returned to movement system
- Key algorithms or constraints
  - A* with heuristic (Manhattan or Euclidean), congestion cost added to G-cost

## Acceptance Criteria
- Drones can compute routes avoiding congested tiles; tests validate behavior

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Pathfinding must be performant for many agents; consider caching or incremental path updates
