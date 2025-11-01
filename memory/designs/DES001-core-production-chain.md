# DES001 - Core Production Chain

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #1

## Motivation / Summary
Complete the basic production chain with extractors → assemblers → fabricators pipeline working correctly.

## Requirements (EARS-style)
- WHEN the simulation runs, THE SYSTEM SHALL produce resources from buildings following balance formulas [Acceptance: observe production rates match tests]
- WHEN heat increases, THE SYSTEM SHALL reduce throughput according to heat formula [Acceptance: heat affects throughput visibly]
- WHEN buildings exist in a chain, THE SYSTEM SHALL move resources through extractors → assemblers → fabricators correctly [Acceptance: resource flow visible in UI]

## High-level design
- Components involved (files, modules)
  - `src/sim/balance.ts`
  - `src/ecs/systems/productionSystem.ts`
  - Building components and inventories in ECS
- Data flow / interactions
  - Producers calculate output per tick using balance helpers, decrement inputs and increment outputs, and update inventories shared on entities
- Key algorithms or constraints
  - Use existing formula: `output_per_sec = k * (tier^1.5) / (1 + heatRatio)`
  - Ensure deterministic tick ordering so production and transfers are consistent

## Acceptance Criteria
- Buildings produce resources at expected rates
- Heat affects throughput visibly
- Resource flow visible in UI

## Implementation tasks
- [ ] Implementation step 1
- [ ] Implementation step 2
- [ ] Unit tests / validation
- [ ] Update memory index files

## Notes / Risks
- Balancing formulas must match `balance.ts`; changes there affect many systems
- Visual feedback requires uiSnapshotSystem to provide producer states
