# [DESIGN006] Visibility-Driven Render Adapter v1 (Frontier Instancing)

**Status:** Completed  
**Added:** 2025-12-30  
**Updated:** 2025-12-30

## Summary

Implement a visibility-driven rendering adapter that draws only the *visible set*
(frontier voxels by default) instead of expanding active regions into dense voxel
volumes.

This design aligns the implementation with:

- `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- `docs/ARCHITECTURE/TECH002-voxel-world-model.md`
- `docs/ARCHITECTURE/TECH003-voxel-chunk-representation-and-render-adapters.md`
- `docs/ARCHITECTURE/DEC004-render-visibility-driven-and-chunk-caches.md`

## Problem statement

Current rendering patterns risk a performance cliff because they:

- scan full chunk volumes (`CHUNK_SIZE³`) to decide what to render
- instance interior solid voxels that are invisible by definition

These choices defeat the main benefit of DEC003 (procedural base + sparse edits)
by eagerly materializing the implicit world into explicit geometry.

## Goals

- Default rendering is **visibility-driven** (DEC004).
- Renderer state updates are **delta-driven** (TECH001): apply frontier add/remove
  and voxel edits, avoid chunk rescans.
- Maintain modularity:
  - simulation world model stays independent of rendering
  - render adapter can be swapped (frontier instancing now, mesh later)
- Preserve main-thread responsiveness (TECH001 / DEC001).

## Non-goals (v1)

- Advanced meshing (greedy meshing, surface nets).
- Minecraft-like paletted/bitpacked chunk storage as the source of truth.
- Perfect occlusion culling or LOD.

## Chosen approach (v1): Frontier Instancing Adapter

Render only **frontier solid voxels** (mineable surface): solid voxels with at
least one 6-neighbor air.

Rationale:

- Frontier is already tracked by the engine for mining rules (TECH002).
- Frontier updates are local: a voxel edit changes frontier status for at most 7
  voxels (the edit + 6 neighbors).
- Instanced cubes are already supported and cheap to update when changes are
  incremental.

## Interfaces & data flow

### Simulation → Main thread payload

Use existing protocol support for frontier deltas:

- `edits?: VoxelEdit[]` (authoritative edits; collision proxy consumes this)
- `frontierAdd?: Float32Array` packed xyz triples
- `frontierRemove?: Float32Array` packed xyz triples
- `frontierReset?: boolean` (world re-init / prestige)

Notes:

- `frontierAdd/remove` represent the *visibility set* to draw.
- `edits` remain required for correctness (collision proxy and any future systems).

### Renderer adapter API

Renderer maintains a single instanced mesh for frontier cubes.

Core operations:

- `applyFrontierReset()`
- `applyFrontierAdd(positions: Float32Array)`
- `applyFrontierRemove(positions: Float32Array)`

This adapter is strictly a render concern and does not depend on chunk storage.

## Data structures (renderer)

Maintain an O(1) add/remove mapping:

- `indexByKey: Map<Key, number>`
- `keysByIndex: Key[]`

Removal uses swap-with-last:

1. Look up `idx = indexByKey.get(key)`
2. Let `lastIdx = count - 1`
3. If `idx !== lastIdx`, move instance data from `lastIdx` → `idx` and update:
   - `movedKey = keysByIndex[lastIdx]`
   - `keysByIndex[idx] = movedKey`
   - `indexByKey.set(movedKey, idx)`
4. Delete removed key entries; decrement count.

### Key format

v1 may continue using string keys for simplicity, but the adapter must keep the
keying strategy contained so it can be upgraded:

- v1: `key = "${x},${y},${z}"`
- future: packed numeric key(s) as described in TECH003

## Capacity & rebuild strategy

- Maintain a capacity for the frontier instanced mesh.
- When frontier grows beyond capacity, grow by ~1.5x and rebuild instance
  buffers.
- Prefer incremental updates most frames; reserve full rebuild only for:
  - capacity growth
  - `frontierReset`

## Chunking interaction

Chunking remains useful for:

- deciding which regions to request/consider based on player/drone locality
- future mesh adapters that rebuild per-chunk

But frontier instancing does **not** require chunk-volume scanning.

## Error handling / consistency

- If a frontier delta references a voxel that is not solid per the engine, the
  engine is authoritative; renderer should treat the delta as truth (the renderer
  is a view).
- On `frontierReset`, renderer clears visibility state and awaits a new frontier
  seed (either a bulk frontier snapshot or a stream of adds).

## Performance considerations

- Prefer typed arrays (`Float32Array`) for frontier position payloads.
- Avoid allocations in per-frame application of frontier deltas.
- Keep instance updates bounded by delta size (not chunk volume).

## Validation plan

- Unit tests (engine-side): frontier update locality (edit affects only 7 voxels)
  and `frontierAdd/remove` correctness.
- Integration tests (protocol): applying a mine edit produces matching
  `edits + frontierAdd/remove`.
- Renderer-focused tests (logic-only): swap-with-last removal keeps bijection
  between `indexByKey` and `keysByIndex`.

## Incremental implementation plan

1. Ensure the Worker emits `frontierReset` on world init/prestige.
2. On init, emit an initial frontier snapshot as `frontierAdd` (or a dedicated
   field if preferred).
3. On `mineVoxel`, emit `edits` plus frontier add/remove deltas.
4. On the main thread, replace “populate chunk by volume scan” with the frontier
   instancing adapter wired to `frontierAdd/remove/reset`.
5. Keep the old dense-chunk instancing behind a debug flag for troubleshooting,
   but not as the default mode.

## Acceptance criteria

- Default rendering does not scan full `CHUNK_SIZE³` volumes to decide what to
  render.
- Mining a voxel causes O(delta) renderer work, where delta ≤ 7 voxels.
- Visual behavior matches gameplay rules: digging reveals deeper voxels only when
  they become frontier.
- Architecture remains consistent with TECH001/2/3 and DEC004.
