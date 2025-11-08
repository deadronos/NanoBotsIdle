# DES030 - Heat & Power system

**Status:** Draft  
**Added:** 2025-11-08  
**Updated:** 2025-11-08

## Motivation

Heat generation and power distribution are core simulation concerns that interact with building throughput and overclock behavior. Clear design, test coverage, and documented safe ranges will reduce regressions and make tuning predictable.

## Requirements (EARS-style)

1. WHEN a building produces heat, THE SYSTEM SHALL accumulate heat in a per-entity `HeatAccumulator` and propagate a fraction to adjacent tiles/entities each tick. [Acceptance: unit tests for propagation and decay].
2. WHEN a building is overclocked, THE SYSTEM SHALL scale heat generation proportionally to the overclock factor and communicate thermal stress to overclock control logic. [Acceptance: integration test showing overclock → heat → throttling].
3. WHEN system-wide power load approaches capacity, THE SYSTEM SHALL apply power distribution policies (graceful degradation, prioritization) rather than sudden failure where possible. [Acceptance: documented policy + test].

## High-level Design

- Components: `HeatSource` (heat per tick), `ThermalCapacity` (max safe heat), `Cooling` (passive or active cooling rates), `PowerLink` (for power distribution).  
- Heat Propagation: each tick, a fraction of an entity's heat is transferred to neighboring tiles based on conductivity coefficients; heat decays over time.  
- Overclock Interaction: `Overclockable` affects both production rate and heat generation using deterministic scaling factors; overclock controllers will query `HeatAccumulator` to decide safe/unsafe states.  
- Power Distribution: maintain simple load accounting per power network; when load > capacity, use prioritization rules and signal to buildings for graceful throttling.

## Interfaces & Data Models

- `HeatAccumulator { value: number, capacity: number }` on entities that produce heat.  
- `tickHeatPropagation(world: World, deltaTicks: number): void` — system-level function.  
- `getThermalStress(entityId: EntityId): ThermalStress` — helper for UI and control logic.  

## Acceptance Criteria

- Unit tests for heat propagation and decay are added and passing.  
- Integration tests exercise overclocked building behavior showing sensible thermal response (e.g., throttling or increased failure probability).  
- Power distribution behavior is documented and covered by tests that simulate overload conditions.

## Implementation Tasks

1. Add targeted unit tests in `src/ecs/systems/heatAndPowerSystem.test.ts`. (link: `memory/tasks/TASK031-heat-power-tests.md`)  
2. Add integration tests for overclock interactions.  
3. Document tuning guidance (coefficients, safe ranges) in this design file.

## Notes

Keep the thermal model simple and deterministic. Avoid stochastic failure modes for core tests; reserve stochastic experiments for later balancing runs.
