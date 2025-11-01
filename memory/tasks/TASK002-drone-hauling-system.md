# TASK002 - Drone Hauling System

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement autonomous drone movement for resource hauling between buildings with proper pathfinding and congestion handling.

## Thought Process
Split hauling into assignment, pathfinding, and movement systems. Use A* with congestion cost for route calculation and a task queue for assignment to avoid deadlocks.

## Implementation Plan
- [ ] Step 1: implement task queue and hauler assignment
- [ ] Step 2: implement A* pathfinding and congestion API
- [ ] Step 3: integration tests for multi-drone scenarios
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- Drones pick up from source and deliver to destination
- Multiple drones don't deadlock
- Visual feedback shows drone cargo state
