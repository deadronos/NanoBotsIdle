# TASK014 - Advanced Pathfinding

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement smooth swarm movement with congestion avoidance and flow-field pathfinding. See Issue #14.

## Thought Process
Deliver A* with congestion cost as MVP, then iterate to flow-field for performance and lane emergence.

## Implementation Plan
- [ ] Implement A* pathfinding with congestion cost
- [ ] Add debug overlays for paths and congestion
- [ ] Implement flow-field optimization as a follow-up
- [ ] Add performance benchmarks for 50+ drones

## Progress Log


## Acceptance Criteria
- Drones avoid traffic jams naturally
- Higher congestion awareness => better paths
- 50+ drones don't cause performance issues

