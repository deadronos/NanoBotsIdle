## DEC003: Voxel World = Procedural Base + Sparse Edits Overlay

**Status:** Accepted  
**Last updated:** 2025-12-29

## Context

A true 3D voxel world can be large even at modest radii and depths. Storing every
voxel explicitly is wasteful for early gameplay, and syncing full world state to
the renderer/collision layer would be expensive.

## Decision

Represent the world as:

- A deterministic procedural base world (seeded and derived from `(x, z)` surface
  height rules), plus
- A sparse edits overlay for mined/placed voxels.

The engine is authoritative for edits. The main thread mirrors edits for
collision and uses them to schedule rendering updates.

## Consequences

- The same procedural rules (seed + config) must be shared across engine and
  collision proxy.
- Edits must be transmitted reliably and applied in order.
- Chunking is still useful for addressing and mesh rebuild scheduling, even if
  storage remains sparse.
