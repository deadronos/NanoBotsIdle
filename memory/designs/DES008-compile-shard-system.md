# DES008 - Compile Shard System

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #8

## Motivation / Summary
Implement prestige currency calculation and flow with real-time shard projection to close the run and provide meta progression.

## Requirements (EARS-style)
- WHEN run metrics are tracked, THE SYSTEM SHALL compute projected compile shards using the formula in `src/sim/balance.ts` [Acceptance: unit test validates formula outputs].
- WHEN the player opens the TopBar, THE SYSTEM SHALL show a real-time projection of shards if they were to prestige now [Acceptance: UI snapshot contains projected shards].

## High-level design
- Components / modules: CompileScoringSystem, balance.ts, uiSnapshotSystem, prestige flow in `useGameStore`.
- Data flow: CompileScoringSystem aggregates peakThroughput/cohesion/stress and passes projection to uiSnapshot for display.

## Acceptance Criteria
- Shard calculation matches design spec
- Players see projected shards in real-time
- Prestige resets run state but keeps meta state
- Breakdown shows contribution of each factor

## Implementation tasks
- [ ] Implement CompileScoringSystem to track metrics
- [ ] Integrate with uiSnapshot to show projection
- [ ] Implement prestige flow and prestige screen
- [ ] Unit tests validating formula and projection

## Notes / Risks
- Ensure deterministic accumulation of metrics across dt steps for reproducible projections.
