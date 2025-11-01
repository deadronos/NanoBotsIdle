# DES011 - Fork Mechanics

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #11

## Motivation / Summary
Implement intra-run mini-prestige (Fork) where players sacrifice drones to obtain Fork Points, which are spent to buy run-local behavior modules.

## Requirements (EARS-style)
- WHEN Fork is triggered, THE SYSTEM SHALL remove specified drones, compute Fork Points based on sacrificed value, and open the Fork modal for module purchase [Acceptance: unit test validates token calculation].

## High-level design
- Components: ForkPoints accumulator in run state, Fork modal UI, behavior module registry (run-local).
- Flow: Player triggers Fork -> system computes points -> UI shows modules -> player purchases -> respawn new drones with selected behavior.

## Acceptance Criteria
- Fork grants proportional Fork Points
- All drones are removed on Fork (configurable) and respawn with chosen behaviors
- Fork Points reset on full prestige

## Implementation tasks
- [ ] Implement Fork action and ForkPoints calculator
- [ ] Implement Fork modal UI and module buy flow
- [ ] Implement post-fork drone respawn and behavior assignment
- [ ] Add unit/integration tests for fork flow

## Notes / Risks
- Fork is destructive (removes drones); ensure undo/confirmation UI and that it is atomic in the simulation.
