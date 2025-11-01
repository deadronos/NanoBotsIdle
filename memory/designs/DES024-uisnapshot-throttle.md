# DES024 - uiSnapshotSystem and snapshot throttle

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #24

## Motivation / Summary
Implement `uiSnapshotSystem(world)` which derives a lightweight UI state and writes it to the Zustand store at a configurable throttle (default 10Hz).

## Requirements (EARS-style)
- WHEN the world ticks, THE SYSTEM SHALL produce a UISnapshot with TopBar, entity list, bottlenecks and phase at configured throttle [Acceptance: UISnapshot contains required fields and is updated at configured rates]
- WHEN React consumes snapshot, THE SYSTEM SHALL avoid per-tick rerenders by throttling snapshot writes [Acceptance: React can consume it without per-tick rerenders]

## High-level design
- Components involved (files, modules)
  - `src/ecs/systems/uiSnapshotSystem.ts`
  - `useGameStore` bridge or lightweight writer
- Data flow / interactions
  - uiSnapshotSystem reads world state and publishes compressed snapshot to Zustand at configurable rate (default 10Hz)
- Key algorithms or constraints
  - Throttle implementation, snapshot shape definition and tests for timing behavior

## Acceptance Criteria
- UISnapshot contains required fields and is updated at configured rates; React can consume it without per-tick rerenders

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Snapshot shape changes may require coordinated updates in many UI components
