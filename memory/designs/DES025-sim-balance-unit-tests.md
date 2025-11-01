# DES025 - Sim balance unit tests

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #25

## Motivation / Summary
Add unit tests for core balance helpers in `src/sim/balance.ts`.

## Requirements (EARS-style)
- WHEN running tests, THE SYSTEM SHALL validate `polyCost()` monotonic growth across sample levels [Acceptance: polyCost monotonic tests pass]
- WHEN running tests, THE SYSTEM SHALL validate `getProducerOutputPerSec()` behavior for zero and edge heat ratios [Acceptance: edge cases handled]
- WHEN running tests, THE SYSTEM SHALL ensure hauling and compile estimates return finite positive outputs [Acceptance: tests validate known cases]

## High-level design
- Components involved (files, modules)
  - `src/sim/balance.ts`
  - Test files under `src/sim/__tests__`
  - Vitest configuration and test scripts
- Data flow / interactions
  - Unit tests call balance helpers with deterministic inputs and assert numeric properties
- Key algorithms or constraints
  - Use sample inputs that exercise boundaries (zero, large heatRatio, extreme tiers)

## Acceptance Criteria
- All tests run in CI (`npm test`) and validate numeric stability and edge cases

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Floating point edge cases and non-determinism across platforms; use tolerances in assertions
