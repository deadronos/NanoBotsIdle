# DES005 - Phase 1 - Bootstrap Progression

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #5

## Motivation / Summary
Implement the first 15 minutes of gameplay with unlock progression and cost scaling to guide early-run pacing and player onboarding.

## Requirements (EARS-style)
- WHEN a new run starts, THE SYSTEM SHALL enable the first unlocks timeline (2, 5, 10 minutes) to gradually surface mechanics [Acceptance: automated timeline triggers in integration tests].
- WHEN player builds X structures or reaches 2-3 drones, THE SYSTEM SHALL unlock ghost building placement [Acceptance: unit test sets condition and verifies unlocked flag].

## High-level design
- Components: meta progression manager, progression timers, unlock gating logic in UI and createWorld seeds.
- Data flow: progression timers update run state; UI reads run state to enable features; createWorld uses meta to set starting conditions.

## Acceptance Criteria
- Players can build 3-5 drones in first 15 minutes (measured in simulated run test).
- Ghost building unlocks after building 2-3 drones.
- Routing priorities become available after a simulated logistics complexity threshold.
- Precise checks: automated simulation verifying drone counts and unlock flags at the specified times.

## Implementation tasks
- [ ] Implement progression timer manager and unlock conditions
- [ ] Wire unlocks into UI (BuildPanel, AIPanel)
- [ ] Add integration tests for the timeline
- [ ] Update memory index files

## Notes / Risks
- Tuning of timing and costs will need iteration; keep parameters data-driven in `src/sim/balance.ts`.
