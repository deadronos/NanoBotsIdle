# DES014 - Advanced Pathfinding

**Status:** Draft
**Created:** 2025-11-01
**Issue:** GitHub Issue #14

## Motivation / Summary
Implement smooth swarm movement with congestion avoidance and flow-field pathfinding to enable scalable drone movement.

## Requirements (EARS-style)
- WHEN many drones are present, THE SYSTEM SHALL compute paths that minimize congestion cost to avoid traffic jams [Acceptance: benchmark shows reduced congestion metric].

## High-level design
- MVP: A* grid with congestion cost (tile penalty)
- Later: flow-field generation for destinations and lane emergence
- Data: congestion heatmap updated each tick

## Acceptance Criteria
- Drones avoid traffic jams naturally
- 50+ drones don't cause performance issues (benchmark target)
- Visual debug overlay available for paths

## Implementation tasks
- [ ] Implement A* with congestion cost
- [ ] Add flow-field optimization step for hot spots
- [ ] Add debug overlays and performance tests

## Notes / Risks
- Flow-field generation is CPU intensive; schedule background updates and caching.
