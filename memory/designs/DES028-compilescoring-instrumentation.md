# DES028 - CompileScoring instrumentation & debug export

**Status:** Completed
**Created:** 2025-11-01
**Updated:** 2025-11-01
**Issue:** GitHub Issue #28

## Motivation / Summary
Add detailed debug-export (JSON) for compile scoring metrics to aid testability and shard-projection validation.

## Requirements (EARS-style)
- WHEN a run ends, THE SYSTEM SHALL produce a debug JSON with peakThroughput, cohesionScore, stressSecondsAccum and other relevant counters [Acceptance: JSON contains required fields and matches internal counters].

## High-level design
- CompileScoringSystem collects metrics and emits a structured debug object at run end; uiSnapshot shows projection numbers.

## Acceptance Criteria
- Exported debug JSON is produced at run end and is usable to assert scoring calculations in tests
- TopBar projection numbers match exported debug JSON

## Implementation tasks
- [ ] Implement debug export in CompileScoringSystem
- [ ] Wire projection numbers in TopBar to exported values
- [ ] Add unit tests to compare internal counters and exported JSON

## Notes / Risks
- Debug exports should be dev-only and not bundled in production or should be opt-in.
