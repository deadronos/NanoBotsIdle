 # TASK032 - Factory canvas & overlays

 **Status:** Pending  
 **Added:** 2025-11-08  
 **Updated:** 2025-11-08

## Original Request

Add visual tests, accessibility checks, and basic performance profiling for `FactoryCanvas` and the overlay components that display power/heat.

## Implementation Plan

1. Add visual snapshot tests for `FactoryCanvas` focused on overlay visibility and layout.  
2. Run simple perf measurements for paint/update load during typical simulation ticks.  
3. Add accessibility checks for overlay controls and interactions.  
4. Document best-practices for rendering and throttling in `memory/designs` or this task file.

## Acceptance Criteria

- Snapshot or visual tests exist and are runnable.  
- Basic perf metrics recorded and documented.  
- Accessibility checks pass for overlay controls.

## Progress Log

### 2025-11-08

- Task created.
