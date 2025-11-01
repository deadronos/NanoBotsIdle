# TASK025 - Sim balance unit tests

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Add unit tests for core balance helpers in `src/sim/balance.ts`.

## Thought Process
Write deterministic tests for `polyCost`, `getProducerOutputPerSec`, `getHaulingEffectiveRate`, and `getCompileShardEstimate` covering edge and nominal cases with tolerances.

## Implementation Plan
- [ ] Step 1: add unit tests in `src/sim/__tests__`
- [ ] Step 2: run tests locally and iterate
- [ ] Step 3: ensure `npm test` script runs tests in CI
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- All tests run in CI (`npm test`) and validate numeric stability and edge cases
