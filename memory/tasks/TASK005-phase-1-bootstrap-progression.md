# TASK005 - Phase 1 - Bootstrap Progression

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement the first 15 minutes of gameplay with unlock progression and cost scaling. See Issue #5 in `GITHUB_ISSUES.md` for tasks and acceptance criteria.

## Thought Process
Start with a small progression manager that exposes unlock flags on run state. Keep timing and thresholds data-driven so tuning is simple.

## Implementation Plan
- [ ] Step 1: implement progression manager that advances with sim time
- [ ] Step 2: wire unlock flags into UI panels
- [ ] Step 3: add integration tests with simulated time
- [ ] Step 4: document parameters and add to memory/designs

## Progress Log


## Acceptance Criteria
- Players can build 3-5 drones in first 15 minutes
- Ghost building unlocks after building 2-3 drones
- Routing priorities become available after logistics complexity increases

