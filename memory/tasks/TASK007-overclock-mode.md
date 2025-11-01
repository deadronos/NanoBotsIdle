# TASK007 - Phase 3 - Overclock Mode

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement dramatic endgame with Overclock mode, heat crisis, and self-termination mechanics (Issue #7).

## Thought Process
Expose a single run-level boolean for overclock; systems read it and apply multipliers. Track stress_seconds in CompileScoringSystem and surface controls in BottomBar UI.

## Implementation Plan
- [ ] Add run state flag for overclock
- [ ] Modify ProductionSystem and HeatSystem to respect overclock multipliers
- [ ] Add SelfTerminationSystem and UI flows
- [ ] Add integration tests for overclock scenarios

## Progress Log


## Acceptance Criteria
- Overclock visibly increases throughput 2-5x
- Heat rises rapidly under overclock
- Players can survive 10-15 minutes in overclock

