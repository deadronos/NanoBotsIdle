## DEC002: Simulation Engine Is Worker-Hosted and Authoritative

**Status:** Accepted  
**Last updated:** 2025-12-29

## Context

As voxel edits, drone counts, and future systems grow, CPU work must not block
rendering. The architecture must support moving simulation off the main thread
without rewriting core logic.

## Decision

Host the simulation engine in a Web Worker. The Worker owns canonical simulation
state and produces deltas for the main thread.

The main thread drives tick scheduling (it sends `STEP` messages) and gates
ticks so there is at most one step in flight.

## Consequences

- Engine code must be pure and Worker-safe (no DOM/WebGL/Three).
- A typed message protocol is required and must remain stable as features grow.
- Large payloads should use typed arrays + transferables and reuse buffers.
