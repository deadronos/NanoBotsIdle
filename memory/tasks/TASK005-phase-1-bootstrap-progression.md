# TASK005 - Phase 1 - Bootstrap Progression

**Status:** In Progress
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement the first 15 minutes of gameplay with unlock progression and cost scaling. See Issue #5 in `GITHUB_ISSUES.md` for tasks and acceptance criteria.

## Thought Process
Start with a small progression manager that exposes unlock flags on run state. Keep timing and thresholds data-driven so tuning is simple. Use a hybrid event-first / time-fallback model so players who organically reach event thresholds (for example building drones) get unlocks immediately while players who do not progress still see features unlocked by time.

## Implementation Plan
The user has approved simulation-time, event-first defaults and wants specific unlock timings. Proposed concrete plan to implement:

- Step 1: Add data-driven config
	- Create `src/sim/progression-config.ts` exporting defaults and named unlock definitions. Each unlock has: id, displayName, description, iconId, timeThreshold (seconds), eventCondition (function signature or descriptor), and telemetry tags.

- Step 2: Implement progression manager
	- Create `src/sim/progression.ts` that subscribes to the sim tick loop, uses simTime (seconds) and world queries (e.g., drone count) to evaluate unlocks, and updates the progression state slice. It should pause while sim is paused and award unlocks on the next sim step after condition becomes true.

- Step 3: Add progression state slice
	- Add `src/state/progression.ts` (or a new slice in existing run state) holding unlocked flags, unlockTimes, and history. Ensure the slice is saved/loaded with the run save.

- Step 4: UI wiring and notifications
	- Wire `BuildPanel` and relevant UI to read progression slice and enable features. Integrate with the existing toast/notification system to show a one-time notification using displayName/description/iconId.

- Step 5: Migration & persistence
	- On save load, re-evaluate unlocks against current world (drone count, built structures). This ensures older saves or manual changes still award appropriate unlocks.

- Step 6: Tests
	- Add Vitest integration tests under `src/test/` that create a simulated world with 1 starting drone and a controllable tick loop. Verify that second drone unlock occurs at t=60s and third at t=180s. Also test ghost-building unlock when building 2 drones early.

- Step 7: Documentation
	- Update `memory/designs/DES005-phase-1-bootstrap-progression.md` and this task file with final tunables and instructions for designers.

## Progress Log

- 2025-11-01: Clarified design choices with the user. Decided on sim-time, hybrid event-first model, persistence in saves, data-driven config, and a default schedule: unlock 2nd drone at 60s, 3rd at 180s; ghost building event at 2 drones or 120s time-fallback; routing priorities at logistics threshold or 360s.



## Acceptance Criteria
- Players can build at least 3 drones in the first 15 minutes. Default schedule to verify in tests:
	- start with 1 drone
	- unlock second build slot at t = 60 seconds
	- unlock third build slot at t = 180 seconds
- Ghost building unlocks when player-built drone count >= 2 OR at t = 120 seconds (whichever is earlier).
- Routing priorities become available when `logisticsComplexity >= progressionConfig.logisticsThreshold` OR at t = 360 seconds (6 minutes) as a time-fallback.
- Unlocks grant immediate availability on the next sim update and produce a one-time toast/notification containing displayName, description and iconId.
- Progression pauses while the sim is paused and resumes when unpaused.

