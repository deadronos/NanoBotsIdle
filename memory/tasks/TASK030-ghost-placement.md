 # TASK030 - Ghost placement / placement preview

 **Status:** Pending  
 **Added:** 2025-11-08  
 **Updated:** 2025-11-08

## Original Request

Implement and test the placement preview (ghost) UX and placement validation logic. Ensure preview shows correct snap, orientation, and conflict markers.

## Implementation Plan

1. Audit `src/ecs/systems/ghostPlacementSystem.ts` and the `BuildPanel` integration.  
2. Add unit tests to validate placement rules and snapping behavior.  
3. Add small UI test or manual verification steps for visual correctness in `FactoryCanvas`.  
4. Document common edge cases and expected validation messages in this task file.

## Acceptance Criteria

- Placement preview shows correct snap and orientation in typical cases.  
- Placement validation rules are covered by tests.  
- Documentation of edge cases is present.

## Progress Log

### 2025-11-08

- Task created.
