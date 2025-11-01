# DES003 - Basic UI & Controls

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #3

## Motivation / Summary
Polish and complete all UI panels for building placement, monitoring, and game control.

## Requirements (EARS-style)
- WHEN the game state updates, THE UI SHALL display live values for heat/power/throughput in the TopBar [Acceptance: TopBar shows live data]
- WHEN player selects a building, THE UI SHALL show building details and allow placement [Acceptance: selected buildings show details]
- WHEN placing buildings, THE UI SHALL offer a ghost placement mode and queuing [Acceptance: ghost buildings can be queued]

## High-level design
- Components involved (files, modules)
  - `src/ui/panels/TopBar.tsx`, `BuildPanel.tsx`, `AIPanel`, `BottomBar`
  - `uiSnapshotSystem` to feed Zustand store
- Data flow / interactions
  - `uiSnapshotSystem` produces a lightweight snapshot consumed by React components to minimize re-renders
- Key algorithms or constraints
  - Throttle UI updates to avoid per-tick rerenders; ensure placement ghosting aligns with simulation coordinates

## Acceptance Criteria
- All panels display live data from uiSnapshot
- Users can place buildings via UI
- Selected buildings show details
- Ghost buildings can be queued

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Tight coupling between snapshot shape and UI; changing snapshot requires updating many components
