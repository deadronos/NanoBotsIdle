 # TASK031 - Heat & Power tests and docs

**Status:** Pending  
**Added:** 2025-11-08  
**Updated:** 2025-11-08

## Original Request

Improve test coverage and documentation for the heat and power subsystems (`heatAndPowerSystem.ts`, `HeatSource` component) and validate interactions with overclockable buildings.

## Implementation Plan

1. Add unit tests in `src/ecs/systems/heatAndPowerSystem.test.ts` covering heat propagation and power distribution edge cases.  
2. Add integration tests exercising overclocked buildings and their heat contributions.  
3. Add the design note in `memory/designs/DES030-heat-power-system.md` and link it here.  
4. Add acceptance tests that show the UI overlays (`HeatOverlay`, `PowerOverlay`) reflecting simulation state.

## Design

- See design note: `memory/designs/DES030-heat-power-system.md` (DES030) for requirements, interfaces and tuning guidance.

## Acceptance Criteria

- Tests for heat propagation and power distribution are added and passing.  
- Overclock interactions are covered by at least one integration test.  
- Documentation updated with guidance for tuning heat/power values.

## Progress Log

### 2025-11-08

- Task created.
