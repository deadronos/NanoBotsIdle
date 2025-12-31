## DEC001: Player Movement/Collision Stays on Main Thread

**Status:** Accepted  
**Last updated:** 2025-12-29

## Context

Player movement and camera input need to remain responsive at interactive frame
rates. Waiting on a Worker roundtrip for collision would introduce latency and
frame-to-frame inconsistency under load.

## Decision

Keep player movement, camera input, and collision resolution on the main thread.

The main thread maintains a read-only collision proxy that mirrors authoritative
voxel edits from the simulation Worker.

## Consequences

- The engine/Worker remains authoritative, but the collision proxy must match
  the engine's world rules (seed, bedrock, edits).
- Voxel edits must be sent to the main thread as deltas (not full snapshots).
- Any changes to world rules require updating both engine and proxy logic.
