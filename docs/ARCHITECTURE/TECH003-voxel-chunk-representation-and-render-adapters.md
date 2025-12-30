# TECH003: Voxel Chunk Representation & Render Adapters

**Status:** Draft (intended target architecture)
**Last updated:** 2025-12-30

## Summary

This project distinguishes three concepts that are often conflated in voxel engines:

1. **Chunking for addressing**: dividing world space into fixed-size regions (recommended 16³) for locality, culling, and update routing.
2. **World storage representation**: how materials are stored/derived (procedural base + sparse edits in v1).
3. **Render representation**: what geometry we submit to the GPU (frontier instances vs meshed surfaces vs debug volume).

Minecraft-style section formats (dense 16³ arrays, often palette/bit-packed and omitted via a bitmask) are optimized for **dense storage and network serialization**. NanoBotsIdle’s baseline (DEC003) is optimized for **large procedural worlds with sparse modifications**.

The core architectural rule is:

- The simulation’s canonical world model remains **procedural base + sparse edits**.
- Chunk formats (dense, paletted, bit-packed) are optional **internal caches and/or serialization formats**, not the source of truth.
- Rendering must avoid expanding the implicit world into a full explicit voxel volume.

## Goals

- Keep the system modular: storage backends and render adapters can evolve independently.
- Avoid perf cliffs from brute-force chunk scans and rendering interior voxels.
- Keep main-thread responsive (TECH001) and player collision authoritative (DEC001).
- Preserve deterministic, testable sim rules (seed + config).
- Keep data flow delta-driven (ship edits/frontier deltas, not full snapshots).

## Non-goals

- Commit to a Minecraft-compatible chunk serialization.
- Implement advanced meshing immediately (greedy meshing / surface nets can come later).
- Implement persistence format requirements (save/load) in this spec.

## Terminology

- **Chunk**: a 3D region of size `CHUNK_SIZE³` (recommended `CHUNK_SIZE = 16`).
- **Section**: an internal subdivision of a chunk used by some formats (Minecraft uses 16³ sections stacked vertically).
- **Procedural base**: deterministic material derived from `(x, y, z, seed, config)`.
- **Edits overlay**: sparse overrides for mined/placed voxels.
- **Frontier**: solid voxels with at least one air 6-neighbor (mineable surface).
- **Visible set**: voxels/faces that the renderer chooses to draw.

## Background: why Minecraft-style chunk formats are “efficient”

Dense section formats are efficient when:

- You must iterate every voxel frequently (e.g., lighting propagation, fluid sim, dense terrain).
- You need compact disk/network IO for large regions.
- You want cache-friendly linear memory access (index math, not hash maps).

They are less efficient when:

- The world is largely implicit/procedural and only a tiny fraction differs from the base.
- Your primary operations are localized edits + queries, not full-volume scans.

NanoBotsIdle’s v1 is explicitly in the second category.

## Architectural model

### 1) Canonical world model (simulation)

Per TECH002 and DEC003:

- Canonical `materialAt(x,y,z)` is computed as `edits.get(key) ?? baseMaterialAt(...)`.
- Frontier tracking is maintained in the engine (mineability predicate).
- On edit, only the edited voxel and its 6 neighbors need frontier re-evaluation.

### 2) Storage backends (pluggable)

The sim world model may be backed by:

- **Procedural + sparse edits (v1)**: best for low edit density.
- **Optional dense chunk cache (v2+)**:
  - Maintain a per-chunk cache only where edit density is high.
  - Consider paletted/bit-packed 16³ arrays (Minecraft-like) to reduce memory and improve iteration speed.
  - Use a “dirty section/chunk” bitmask for invalidation.

Key constraint:

- Backends must preserve the external interface (`materialAt`, `mineVoxel`, etc.). No render-specific concerns in the world model.

### 3) Render adapters (pluggable)

Renderer should support interchangeable adapters:

- **Frontier instancing (recommended v1)**:
  - Draw only frontier voxels (or other visibility set), not all solids.
  - Apply `frontierAdd/frontierRemove` deltas from the engine.
  - Use swap-with-last removal to keep updates O(1).
- **Meshed surfaces (v2+)**:
  - Chunk-local mesh generation of exposed faces.
  - Can run on a Worker/pool and ship vertex/index buffers to main thread.
- **Debug volume (dev only)**:
  - Render all solids for debugging correctness, not performance.

## Data flow & payload design

The render delta should remain **delta-first** and prefer typed arrays when payload sizes grow:

- `edits`: for correctness and collision proxy updates.
- `frontierAdd/frontierRemove`: for fast renderer updates without rescanning.
- `dirtyChunks`: for mesh-based adapters (optional).

Guidelines:

- Prefer packed typed arrays (e.g., `Float32Array` for xyz triples, `Int32Array` for chunk ids) over arrays of objects in hot paths.
- Reuse/transfer buffers where possible (TECH001).

## Efficiency pitfalls to avoid

These are architectural anti-patterns (even if they pass early tests):

- **Brute-force chunk volume scans** to “populate” render state.
- **Rendering interior voxels** (volume instancing) as the default mode.
- **String-keyed hot sets/maps** for large frontier/edits sets at scale.
- Recomputing config/seed-dependent invariants inside tight loops.

## Implications for the current codebase

This spec is intentionally forward-looking. The current implementation contains
patterns that are acceptable for early correctness, but are explicitly *not* the
intended steady-state for performance.

Examples of non-target patterns (to be replaced by visibility-driven adapters):

- Populating a chunk render set by scanning the full `CHUNK_SIZE³` volume and
  adding all solid voxels.
- Treating chunk activation as permission to render all interior solids.
- Recomputing seed/config invariants while iterating a dense voxel volume.

The target state is:

- The renderer maintains a visibility set (frontier voxels or exposed faces).
- The simulation provides delta updates (frontier add/remove, dirty chunks), so
  the renderer does not need to rescan full volumes.

## Optimization roadmap (modular)

### A) Make visibility-driven rendering the default

- Default renderer should track a visibility set (frontier or surface).
- The sim sends explicit deltas that keep renderer state in sync.

This preserves modularity because:

- The sim remains authoritative about the world and mineability.
- The renderer focuses on representation.

### B) Cache invariants and pass “world context” explicitly

- Seed, bedrockY, waterlineVoxelY, quantization parameters are effectively constants for a run.
- Avoid reading config/seed repeatedly in inner loops by computing a context object once and passing it.

### C) Replace string keys where it matters

When scaling beyond early gameplay:

- Replace `${x},${y},${z}` keys for hot structures with packed numeric keys.
- Recommended approach:
  - Use `(cx, cy, cz)` chunk coords + `localIndex = (ly << 8) | (lz << 4) | lx` for 16³.
  - Key the chunk in a `Map<ChunkKey, ChunkData>`, where `ChunkKey` is a packed int tuple or stable string.
  - Keep conversion helpers for debugging and tests.

This change is internal and should not affect external APIs.

### D) Add a dense per-chunk cache only when edit density demands it

Trigger condition examples:

- Frontier/edits sets grow enough that `Map/Set` overhead dominates.
- The sim adds operations requiring bulk iteration (lighting, fluids, caves by 3D noise).

A dense cache should be:

- Optional, scoped, and invalidated per-chunk/section.
- Compatible with delta-driven output (still emit edits/frontier deltas).

### E) Move expensive mesh generation off main thread (later)

- If/when chunk surface meshing becomes the bottleneck, use a separate Worker or worker pool.
- Keep mesh generation pure (no Three imports): input is materials + chunk coords; output is typed arrays.

## Acceptance criteria (architecture)

The architecture is considered compliant when:

- The default render adapter does not require full chunk volume scans.
- A single voxel edit causes O(1)–O(7) world updates (edit + frontier neighborhood), not O(chunk volume).
- The system can add a new render adapter without changing simulation rules.
- The system can add a dense chunk cache backend without changing renderer APIs.
