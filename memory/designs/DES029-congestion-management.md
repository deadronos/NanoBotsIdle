# DES029 - Congestion & traffic management

**Status:** Draft  
**Added:** 2025-11-08  
**Updated:** 2025-11-08

## Motivation

As the simulation scales, drones and movers share constrained paths and chokepoints. Without explicit congestion handling the simulation exhibits pathological queuing, unfair blocking, and poor player-visible latency. This design describes a modest, testable congestion model that integrates with the existing pathfinding and movement systems.

## Requirements (EARS-style)

1. WHEN multiple drones attempt to use the same tile(s) at overlapping times, THE SYSTEM SHALL detect congestion and provide a resolution strategy (queuing, short-term reservations, or rerouting). [Acceptance: unit tests that create a chokepoint and assert progress continues under bounded delay].
2. WHEN a route becomes congested, THE SYSTEM SHALL communicate estimated delay/penalty back to pathfinding so that future routes prefer less-congested alternatives. [Acceptance: pathfinding cost adjustment observed in integration runs].
3. WHEN congestion persists beyond a configured threshold, THE SYSTEM SHALL apply progressive resolution (priority escalation, forced reroute, or temporary reservation revocation). [Acceptance: simulated scenario where starvation is detectable and resolved].

## High-level Design

- CongestionMap (per-tile): maintains short-term occupancy counts and a decaying timestamped weight.  
- Reservation/Claim API: entities may request short-time reservations on a sequence of tiles; reservations include startTick and duration. Reservations are optimistic (best-effort) and can be pre-empted when safety requires.  
- Dynamic Cost Adjustment: pathfinding receives a small cost penalty for high-occupancy tiles so A* will prefer slightly longer but less-congested routes.  
- Local Queueing: tiles maintain a small queue (FIFO with priority hooks) to avoid races; the local queue enforces fairness and prevents immediate re-entry spamming.  
- Monitoring & Escalation: keep per-edge metrics (avg-wait, queue-length) and trigger escalation policies when thresholds exceeded.

## Interfaces & Data Models

- type `CongestionMap = Map<PosKey, { occupancy:number, lastUpdatedTick:number }>`
- `reservePath(entityId: EntityId, path: Pos[], durationTicks: number): Reservation | null`
- `releaseReservation(reservation: Reservation): void`
- `estimateDelay(pathSegment: Pos[]): number` — returns an expected delay penalty used by the pathfinding cost function
- `getTileQueue(pos: Pos): EntityId[]` — diagnostic API for tests

## Interaction with existing systems

- Pathfinding: pathRequests will call `estimateDelay` and add a small penalty to edge costs.  
- MovementSystem: uses reservations to protect a short window of tiles during step planning; releases reservations when entities move.  
- DroneBrain: may opt into reservation-based movement when doing critical deliveries.

## Acceptance Criteria

- Unit tests that simulate a chokepoint (N entities converging on single-tile bottleneck) must show forward progress (no permanent starvation) and bounded average wait time.  
- Pathfinding shows cost-driven avoidance of heavily congested areas in an integration test.  
- Reservation API exists and is exercised by integration tests.  
- Perf baseline: document a small benchmark (ticks/s and average wait) for a target scenario (e.g., 50 drones, single chokepoint) and ensure acceptable regression limits.

## Implementation Tasks

1. Implement `CongestionMap` and reservation primitives. (link: `memory/tasks/TASK029-congestion-management.md`)  
2. Add unit tests for chokepoint and queue behavior under `src/ecs/systems/congestionSystem.test.ts`.  
3. Add an integration scenario using `tickHarness` to record perf baseline.  
4. Tune dynamic cost constants and document guidance in this design file.

## Notes

Start conservatively: prefer short reservations and small A* penalties to avoid destabilizing the pathfinding heuristic. This design intentionally targets incremental improvements with clear tests and measurable metrics.
