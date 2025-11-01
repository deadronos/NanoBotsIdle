# TASK013 - Advanced Drone Behaviors

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement visible AI improvements from Fork modules across all drone systems. See Issue #13.

## Thought Process
Incrementally add features and validate via simulation tests: prefetch, builder coordination, routing overrides.

## Implementation Plan
- [ ] Add prefetch hauling logic to DroneAssignmentSystem
- [ ] Add builder coordination to avoid duplicate targets
- [ ] Implement heat-critical routing and recycling hooks
- [ ] Add visual diagnostics and tests

## Progress Log


## Acceptance Criteria
- Predictive hauling reduces starvation
- Builders efficiently complete blueprints
- Emergency cooling extends survival

