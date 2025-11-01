# TASK025 - Sim balance unit tests

**Status:** Completed
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Add unit tests for core balance helpers in `src/sim/balance.ts`.

## Thought Process
Write deterministic tests for `polyCost`, `getProducerOutputPerSec`, `getHaulingEffectiveRate`, and `getCompileShardEstimate` covering edge and nominal cases with tolerances.

## Implementation Plan
- [x] Step 1: add unit tests in `src/sim/__tests__`
- [x] Step 2: run tests locally and iterate
- [x] Step 3: ensure `npm test` script runs tests in CI
- [x] Step 4: documentation / memory updates

## Progress Log
### 2025-11-01
- Expanded `balance.ts` with polynomial cost, hauling efficiency, and compile shard helpers plus deterministic coverage.
- Updated production throughput tracking to expose per-tick throughput for new scenarios.

## Acceptance Criteria
- All tests run in CI (`npm test`) and validate numeric stability and edge cases
