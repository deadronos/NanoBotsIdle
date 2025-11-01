# TASK004 - Save/Load System

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement game state persistence to localStorage with migration support for version changes.

## Thought Process
Create serialization helpers with schema headers and a migration registry. Implement autosave manager and separate meta/run handling. Provide unit tests for migration scenarios.

## Implementation Plan
- [ ] Step 1: implement serialize/deserialize with schema header
- [ ] Step 2: implement migration helpers and tests
- [ ] Step 3: autosave manager and manual UI
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- Game state persists across browser refreshes
- Meta upgrades saved separately from run state
- Migration handles old save formats gracefully

Expanded Acceptance (concrete checks)
- Autosave persists `meta` and `run` state separately on a 30s interval by default (configurable).
- `serializeWorld()` and `deserializeWorld()` support a schema version header; migration functions handle forward/backward compatibility in tests.
- Unit test: saving a sample world and loading it back produces an equivalent `meta` state and a run state compatible with a newer schema (migration test case).
