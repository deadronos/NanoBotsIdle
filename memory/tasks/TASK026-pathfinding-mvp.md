# TASK026 - Pathfinding MVP (A* grid + congestion)

**Status:** Completed
**Added:** 2025-11-01
**Updated:** 2025-11-02

## Original Request
Provide a minimal A* pathfinding system with tile-level congestion cost to unblock early hauling and movement logic.

## Thought Process
Implement A* over a grid with a congestion cost layer; provide API to update congestion and return paths to movement system. Add tests for avoiding high-cost tiles.

## Implementation Plan
- [x] Step 1: implement A* pathfinder and congestion-aware traversal cost
- [x] Step 2: expose path request API (debug overlay deferred to UI task)
- [x] Step 3: automated test verifying path avoids high-cost tiles
- [x] Step 4: documentation / memory updates

## Progress Log
- 2025-11-02: Added A* implementation, path request queue, and vitest coverage for congestion avoidance.
- 2025-11-02: `npm test -- --run` passes (threads pool). Debug overlay deferred to upcoming UI work.

## Acceptance Criteria
- Drones can compute routes avoiding congested tiles; tests validate behavior
