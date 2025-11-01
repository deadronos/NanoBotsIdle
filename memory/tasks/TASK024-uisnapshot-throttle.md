# TASK024 - uiSnapshotSystem and snapshot throttle

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement `uiSnapshotSystem(world)` which derives a lightweight UI state and writes it to the Zustand store at a configurable throttle (default 10Hz).

## Thought Process
Define UISnapshot shape and implement a throttled publisher that writes to `useGameStore`. Ensure tests cover throttle behavior and snapshot shape.

## Implementation Plan
- [ ] Step 1: define UISnapshot shape and producer
- [ ] Step 2: implement writer to `useGameStore` with throttle
- [ ] Step 3: tests for shape and timing
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- UISnapshot contains required fields and is updated at configured rates; React can consume it without per-tick rerenders
