# DES007 - Phase 3 - Overclock Mode

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #7

## Motivation / Summary
Implement dramatic endgame with Overclock mode, heat crisis, and self-termination mechanics to provide risk/reward climax.

## Requirements (EARS-style)
- WHEN Overclock is toggled ON, THE SYSTEM SHALL apply overclock multipliers to entities flagged Overclockable and start tracking stress_seconds [Acceptance: integration test measures multiplier and stress accumulation].
- WHEN heat exceeds critical thresholds, THE SYSTEM SHALL trigger cascading failure mechanics and allow self-termination for shard gain [Acceptance: simulated scenario leads to cascade].

## High-level design
- Components: Overclockable, HeatSource, HeatSink, CompileEmitter
- Systems: HeatAndPowerSystem (overclock mode), ProductionSystem (reads overclock multipliers), SelfTerminationSystem

## Acceptance Criteria
- Overclock increases throughput 2-5x in measured tests
- Heat rises rapidly under overclock and stress_seconds are tracked
- Players can survive 10-15 minutes in overclock under tuned scenarios

## Implementation tasks
- [ ] Add overclock flag in run state and behavior in production/heat systems
- [ ] Track stress_seconds in CompileScoringSystem
- [ ] Implement self-termination mechanics and UI
- [ ] Add integration tests for overclock scenarios

## Notes / Risks
- Requires careful balance to avoid trivializing shard rewards or making runs impossible.
