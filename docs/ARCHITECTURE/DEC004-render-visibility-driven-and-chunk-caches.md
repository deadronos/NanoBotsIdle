# DEC004: Visibility-Driven Rendering; Chunk Storage Is a Cache

**Status:** Accepted  
**Last updated:** 2025-12-30

## Context

NanoBotsIdle represents the voxel world canonically as a deterministic procedural base plus a sparse edits overlay (DEC003). This keeps memory usage low and makes syncing state across the Worker boundary cheap (ship edits, not full world snapshots).

However, “chunking” can be interpreted in multiple ways:

- a *spatial addressing scheme* (useful for locality and update routing)
- a *storage representation* (dense arrays, paletted bit-packed sections)
- a *render representation* (instancing voxels vs meshing exposed faces)

Minecraft-style chunk/section formats are highly optimized for dense storage and network serialization, but adopting them as the source of truth would pressure the project toward full-volume allocation and iteration patterns that are unnecessary for v1 gameplay and conflict with DEC003’s goals.

Separately, rendering cannot scale if the default behavior expands the implicit/procedural world into explicit “all-solid voxels in a chunk” geometry (interior voxels are invisible and wasteful).

## Decision

1. **Rendering is visibility-driven by default.**
   - The renderer should draw a *visibility set* (e.g., frontier voxels or exposed faces), not the full set of solid voxels in an active region.
   - Updates should be delta-driven (e.g., frontier add/remove, dirty chunk ids) rather than brute-force rescans.

2. **Chunk storage formats (dense arrays, palette/bit-packed sections) are not the world’s source of truth.**
   - If introduced, they exist as optional internal caches and/or serialization formats.
   - Canonical material queries continue to be defined by the procedural base + edits overlay (DEC003 / TECH002).

3. **Chunking remains a first-class addressing primitive.**
   - Chunk coordinates and chunk-size conventions are used for locality, culling, update routing, and mesh rebuild scheduling.

This decision is specified in more detail by:

- `TECH002-voxel-world-model.md`
- `TECH003-voxel-chunk-representation-and-render-adapters.md`

## Consequences

- The simulation API stays stable while render adapters can evolve (frontier instancing → meshed surfaces → future).
- The engine can add a dense chunk cache later without coupling storage decisions to rendering.
- The renderer must maintain a mapping from “visible voxel keys” to GPU instance indices (or mesh chunk buffers) and support efficient removal (e.g., swap-with-last).
- Debug modes may still render dense volumes, but this is explicitly non-default and non-performance-oriented.
