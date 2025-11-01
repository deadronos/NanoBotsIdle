# DES004 - Save/Load System

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #4

## Motivation / Summary
Implement game state persistence to localStorage with migration support for version changes.

## Requirements (EARS-style)
- WHEN the game state changes, THE SYSTEM SHALL serialize run and meta state to localStorage on autosave intervals [Acceptance: autosave persists meta and run state separately]
- WHEN loading a saved blob, THE SYSTEM SHALL read schema header and apply migrations if needed [Acceptance: migration handles old save formats gracefully]
- WHEN user triggers manual load, THE SYSTEM SHALL restore game state equivalently [Acceptance: state restoration across sessions]

## High-level design
- Components involved (files, modules)
  - `src/sim/save.ts` (serializeWorld/deserializeWorld)
  - Migration helpers and version registry
  - Autosave manager and UI controls
- Data flow / interactions
  - World serialization produces blob with schema header; migration functions transform older blobs to current schema before deserialization
- Key algorithms or constraints
  - Maintain separate `meta` and `run` namespaces; provide configurable autosave interval (default 30s)

## Acceptance Criteria
- Game state persists across browser refreshes
- Meta upgrades saved separately from run state
- Migration handles old save formats gracefully

Expanded Acceptance (concrete checks)
- Autosave persists `meta` and `run` state separately on a 30s interval by default (configurable).
- `serializeWorld()` and `deserializeWorld()` support a schema version header; migration functions handle forward/backward compatibility in tests.
- Unit test: saving a sample world and loading it back produces an equivalent `meta` state and a run state compatible with a newer schema (migration test case).

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Migration complexity grows with schema changes; design migrations carefully
- Storing large run blobs in localStorage may hit size limits; consider compression or IndexedDB for larger states
