# TASK027 - Save/Load migration & schema tests

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Extend Issue #4 with schema versioning and migration unit tests.

## Thought Process
Implement migration helper registry and write tests that simulate older blobs and assert migration to current schema yields compatible run/meta state.

## Implementation Plan
- [ ] Step 1: implement migration registry and sample migration functions
- [ ] Step 2: write unit tests simulating older versions
- [ ] Step 3: integrate with autosave/load flow
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- Migration unit tests pass and autosave can restore older-format saves into current runtime
