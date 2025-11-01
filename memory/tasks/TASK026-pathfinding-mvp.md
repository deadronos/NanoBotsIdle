# TASK026 - Pathfinding MVP (A* grid + congestion)

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Provide a minimal A* pathfinding system with tile-level congestion cost to unblock early hauling and movement logic.

## Thought Process
Implement A* over a grid with a congestion cost layer; provide API to update congestion and return paths to movement system. Add tests for avoiding high-cost tiles.

## Implementation Plan
- [ ] Step 1: implement A* pathfinder and congestion layer
- [ ] Step 2: expose API and debug overlay
- [ ] Step 3: automated test verifying path avoids high-cost tiles
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- Drones can compute routes avoiding congested tiles; tests validate behavior
