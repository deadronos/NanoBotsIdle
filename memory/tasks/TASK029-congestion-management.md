 # TASK029 - Congestion & traffic management

**Status:** Pending  
**Added:** 2025-11-08  
**Updated:** 2025-11-08

## Original Request

Cover the `congestionSystem` implementation with tests, document design decisions, and record a performance baseline for common congestion scenarios (chokepoints, multi-drone contention, dynamic re-routing).

## Implementation Plan

1. Add unit tests in `src/ecs/systems/congestionSystem.test.ts` for basic congestion scenarios.  
2. Add an integration scenario (tick harness) that runs a congested layout and records simple perf metrics (ticks, average wait times).  
3. Document expected invariants and behavior in this task file and link to the system source.  
4. Add the design note in `memory/designs/DES029-congestion-management.md` and update this task with the reference.  
5. Run tests and record results in the Progress Log.

## Design

- See design note: `memory/designs/DES029-congestion-management.md` (DES029) for requirements, interfaces and tuning guidance.

## Acceptance Criteria

- Unit tests covering at least 3 congestion scenarios are added and passing.  
- An integration scenario demonstrating congestion is added.  
- A short performance baseline (measure approach + results) is recorded.  
- Design notes or links to `memory/designs/` are present.

## Progress Log

### 2025-11-08

- Task created, scope defined.
