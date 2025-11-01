# DES002 - Drone Hauling System

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #2

## Motivation / Summary
Implement autonomous drone movement for resource hauling between buildings with proper pathfinding and congestion handling.

## Requirements (EARS-style)
- WHEN a haul task is issued, THE SYSTEM SHALL assign a drone to pickup and deliver resources to destination [Acceptance: drones pick up and deliver]
- WHEN multiple drones operate, THE SYSTEM SHALL avoid deadlocks and manage congestion [Acceptance: multiple drones don't deadlock]
- WHEN observing UI, THE SYSTEM SHALL show drone cargo state and paths [Acceptance: visual feedback shows drone cargo state]

## High-level design
- Components involved (files, modules)
  - `src/ecs/systems/pathfindingSystem.ts`
  - `src/ecs/systems/movementSystem.ts`
  - Hauler assignment and task queue modules
- Data flow / interactions
  - Task requests produce haul jobs; assignment system chooses drone; pathfinding produces route; movement system follows route and performs atomic pick/drop
- Key algorithms or constraints
  - A* or flow-field pathfinding with congestion cost; task queue with priority scoring; atomic transfer semantics

## Acceptance Criteria
- Drones pick up from source and deliver to destination
- Multiple drones don't deadlock
- Visual feedback shows drone cargo state

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Pathfinding performance is critical; congestion layer may increase compute cost
- Requires careful testing to avoid emergent deadlocks
