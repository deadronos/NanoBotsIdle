# DES027 - Save/Load migration & schema tests

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #27

## Motivation / Summary
Extend Issue #4 with schema versioning and migration unit tests.

## Requirements (EARS-style)
- WHEN a saved blob is loaded, THE SYSTEM SHALL detect schema version and apply migrations to current format [Acceptance: migration unit tests pass]
- WHEN old formats exist, THE SYSTEM SHALL provide migration helpers to move data forward without data loss [Acceptance: autosave can restore older-format saves]

## High-level design
- Components involved (files, modules)
  - Migration registry and helpers under `src/sim/migrations`
  - Extended tests covering backward compatibility
- Data flow / interactions
  - Deserialize reads header; if version < current, sequentially apply migration functions to upgrade
- Key algorithms or constraints
  - Migrations must be idempotent for safety in repeated application

## Acceptance Criteria
- Migration unit tests pass and autosave can restore older-format saves into current runtime

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Complex migrations may require manual reconciliation steps; aim for small incremental migrations
