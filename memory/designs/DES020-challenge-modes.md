# DES020 - Challenge Modes

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #20

## Motivation / Summary
Add replayability through challenge modifiers and constraints that change run rules and offer scaled rewards.

## Requirements (EARS-style)
- WHEN a challenge mode is selected, THE SYSTEM SHALL modify run rules (resource limits, no-overclock, high-heat start) and adjust rewards accordingly [Acceptance: challenge-specific scenarios run and provide adjusted shard multipliers].

## High-level design
- Challenge modifiers are small declarative objects that alter createWorld parameters and sim rules for the run.
- UI exposes challenge selection and shows modifiers and reward multipliers.

## Acceptance Criteria
- Challenges modify run rules and provide scaled rewards
- Leaderboards or local PBs track challenge runs

## Implementation tasks
- [ ] Implement challenge modifier schema and runner hooks
- [ ] Add UI for selecting challenges and showing rewards
- [ ] Add automated tests for a couple of challenge presets

## Notes / Risks
- Challenge rewards must be balanced to avoid trivializing progression.
