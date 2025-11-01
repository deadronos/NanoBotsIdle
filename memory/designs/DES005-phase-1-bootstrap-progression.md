# DES005 - Phase 1 - Bootstrap Progression

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #5

## Chosen defaults and scope

- Time model: simulation time (sim ticks / seconds) drives progression checks and timers.
- Progression style: hybrid (event-first, time-fallback). Unlocks may occur when the player satisfies an event condition (for example "built N drones") or when the configured timeline reaches a threshold — whichever happens first. Progression checks are evaluated on the next simulation step and paused while the sim is paused.
- Persistence: progression state will be saved with run state. On load, a migration step will re-evaluate unlock conditions against the current world (for example, existing drone count) and award any unlocks immediately on the next sim step.
- Data-driven: timeline and event thresholds are exposed through a config module (suggested path: `src/sim/progression-config.ts`) so tuning is easy.


## Motivation / Summary
Implement the first 15 minutes of gameplay with unlock progression and cost scaling to guide early-run pacing and player onboarding.

## Requirements (EARS-style)
 - WHEN a new run starts, THE SYSTEM SHALL enable the progression timeline and evaluate event-based unlocks on each sim tick (paused while sim is paused) [Acceptance: automated timeline triggers in integration tests].
 - WHEN player builds X structures or reaches an event threshold (for example 2 drones), THE SYSTEM SHALL unlock the associated feature immediately on the next sim tick (event-first hybrid) [Acceptance: unit test sets condition and verifies unlocked flag].

## High-level design
 - ## High-level design
 - Components: progression manager (tick-driven), progression configuration, progression state slice (persisted in run save), unlock gating logic in UI, toast/notification integration, migration hook that re-evaluates unlocks on load.
 - Data flow: progression manager advances using sim time and event checks -> updates the progression slice in run state -> UI reads progression slice to enable/disable features and show toasts -> saves include progression slice -> on load migration re-evaluates conditions.
- Data flow: progression timers update run state; UI reads run state to enable features; createWorld uses meta to set starting conditions.

## Acceptance Criteria
- Players can build at least 3 drones during the first 15 minutes (measured in simulated run test). The progression schedule below is a suggested default and must be verifiable by tests.
- Ghost building unlocks after building 2 drones (event) or after 2 minutes (time), whichever happens first.
- Routing priorities become available after either: (a) logistics complexity metric >= configured threshold (default), or (b) time fallback at 6 minutes.
- Precise checks: automated simulation verifying drone counts and unlock flags at the specified times using the test harness.

## Default progression schedule (suggested)
- Start: player begins run with 1 starting drone.
- t = 60s: unlock second drone build slot (or immediate if player already built 1 additional drone by event).
- t = 180s (3m): unlock third drone build slot.
- Ghost building: unlock when player has built 2 drones OR at t = 120s (2m), whichever comes first.
- Routing priorities: unlock when logisticsComplexity >= config.logisticsThreshold OR at t = 360s (6m) time-fallback.

These defaults are intentionally front-loaded to allow players to reach 3 drones well within 15 minutes while leaving room for tuning.

## Implementation tasks
### Implementation tasks (expanded)
- [ ] Create `src/sim/progression-config.ts` with the default schedule and named unlock definitions (id, displayName, description, iconId, event thresholds, time thresholds).
- [ ] Implement `src/sim/progression.ts` progression manager: subscribes to sim ticks, evaluates event and time conditions, updates progression state, and emits one-time unlock events (for toasts).
- [ ] Add a progression slice in the run state (suggested: `src/state/progression.ts` or a new slice inside existing run store) that stores unlocked flags, timestamps, and a history of unlocks for persistence.
- [ ] Wire UI panels (BuildPanel, Logistics/AI panels) to read the progression slice and enable features accordingly.
- [ ] Integrate with the existing notification/toast system (or add a lightweight toast module) to show a one-time unlock notification containing displayName, description, and iconId.
- [ ] Add migration logic: on load, re-evaluate unlock conditions against current world state (drone counts, structures) and award unlocks immediately if satisfied.
- [ ] Add Vitest integration tests that run a simulated tick loop: start with 1 drone, advance simulated time, and verify unlocks at t=60s and t=180s and ghost-building behavior.
- [ ] Document the config and design in `memory/designs/DES005-phase-1-bootstrap-progression.md` and update `memory/tasks/TASK005-*.md`.

## Notes / Risks
- Tuning will likely require iteration; keep all thresholds in `progresion-config.ts` to simplify changes.
- Migration should be resilient to older saves: when upgrading, re-run unlock evaluation and set unlocked flags accordingly. Ensure backward compatibility when field names change.

## Notes / Risks
- Tuning of timing and costs will need iteration; keep parameters data-driven in `src/sim/balance.ts`.
