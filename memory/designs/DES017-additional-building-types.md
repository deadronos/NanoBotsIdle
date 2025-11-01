# DES017 - Additional Building Types

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #17

## Motivation / Summary
Add more variety to production chains with Storage, new resource types, advanced recipes and a CoreCompiler building for endgame focus.

## Requirements (EARS-style)
- WHEN Storage buildings exist, THE SYSTEM SHALL provide inventory capacity and reduce hauling pressure [Acceptance: integration test with storage shows reduced hauling requests].

## High-level design
- New building definitions under `src/types/buildings.ts` and component mappings in world bootstrapping.
- Storage influences Logistics (DemandPlanningSystem) and DroneAssignment.

## Acceptance Criteria
- Storage reduces hauling overhead
- New resources (Iron, Silicon) introduce deeper production chains
- CoreCompiler acts as meaningful overclock target

## Implementation tasks
- [ ] Implement Storage building component and UI
- [ ] Add new resource types and recipes
- [ ] Implement CoreCompiler entity with compile emitter behavior

## Notes / Risks
- Adding resources increases balancing complexity and will require tuning.
