# TASK010 - Enhanced Starting Conditions

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Apply meta upgrades to create meaningful variety in starting conditions across runs. See Issue #10.

## Thought Process
Make createWorld accept the meta slice and apply deterministic seeds for starting entities. Keep effects transparent and testable.

## Implementation Plan
- [ ] Update createWorld to accept meta params
- [ ] Add unit tests to validate created world against expected seeds
- [ ] Document the seed mapping in memory/designs

## Progress Log


## Acceptance Criteria
- Run 2 feels noticeably faster than Run 1
- Each tree provides distinct benefits
- Starting conditions scale appropriately

