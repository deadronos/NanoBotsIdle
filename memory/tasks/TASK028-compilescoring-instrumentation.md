# TASK028 - CompileScoring instrumentation & debug export

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Add detailed debug-export (JSON) for compile scoring metrics. See Issue #28.

## Thought Process
Expose a dev-only JSON export and ensure numbers match internal counters to allow automated tests and offline analysis.

## Implementation Plan
- [ ] Implement debug export in CompileScoringSystem
- [ ] Wire projection numbers in TopBar to exported values
- [ ] Add unit tests asserting exported numbers match internal counters

## Progress Log


## Acceptance Criteria
- Exported debug JSON is produced at run end and matches internal counters

