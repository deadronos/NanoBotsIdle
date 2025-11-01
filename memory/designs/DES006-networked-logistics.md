# DES006 - Phase 2 - Networked Logistics

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #6

## Motivation / Summary
Implement power system, cooling and Fork Process unlock to introduce mid-run complexity and resource interdependence.

## Requirements (EARS-style)
- WHEN Power Vein segments are placed, THE SYSTEM SHALL connect buildings to core and enable power flow based on demand/supply [Acceptance: unit tests for power connectivity].
- WHEN Coolers are present, THE SYSTEM SHALL reduce global heat as described by HeatSink component [Acceptance: integration test showing heat decrease].

## High-level design
- Components: PowerLink, PowerVein (map entity), HeatSink/Cooler.
- Systems: PowerGridSystem, HeatAndPowerSystem, Diagnostics (AIPanel) and Fork gating logic.

## Acceptance Criteria
- Power veins connect buildings to core and satisfy demand when available.
- Buildings go offline without connected power.
- Coolers reduce heat meaningfully in integration scenarios.
- Diagnostics surface starved/underpowered buildings.

## Implementation tasks
- [ ] Implement PowerGridSystem and PowerVein entity type
- [ ] Add Cooler building and HeatSink behavior
- [ ] Implement Diagnostics hooks into uiSnapshot
- [ ] Integration tests for power connectivity and cooling

## Notes / Risks
- Power routing may interact with pathfinding for visualization; keep systems decoupled.
