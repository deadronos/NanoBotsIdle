# TASK006 - Phase 2 - Networked Logistics

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement power system, cooling, and Fork Process unlock for mid-game complexity (15-25 minute mark). See Issue #6.

## Thought Process
Implement minimal PowerGridSystem first (connectivity + demand aggregation), then integrate Coolers into HeatAndPowerSystem and expose diagnostics to UI.

## Implementation Plan
- [ ] Implement PowerGridSystem and PowerVein entity
- [ ] Add Cooler building and HeatSink semantics
- [ ] Add diagnostics hooks to uiSnapshot
- [ ] Add integration tests for grid connectivity and cooling

## Progress Log


## Acceptance Criteria
- Power veins connect buildings to core
- Buildings go offline without power
- Coolers reduce heat meaningfully
- Diagnostics show starved buildings

