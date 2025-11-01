# TASK028 - CompileScoring instrumentation & debug export

**Status:** Completed
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Add detailed debug-export (JSON) for compile scoring metrics. See Issue #28.

## Thought Process
Expose a dev-only JSON export and ensure numbers match internal counters to allow automated tests and offline analysis.

## Implementation Plan
- [x] Implement debug export in CompileScoringSystem
- [x] Wire projection numbers in TopBar to exported values
- [x] Add unit tests asserting exported numbers match internal counters

## Progress Log
### 2025-11-01
- Replaced compile scoring stub with metric accumulation, shard estimation, and debug snapshot export.
- Wired projected shard numbers into global store and validated via vitest instrumentation tests.


## Acceptance Criteria
- Exported debug JSON is produced at run end and matches internal counters

