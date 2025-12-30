# [DESIGN007] Greedy Meshing Worker v1 (Chunk Surface Geometry)

**Status:** Proposed  
**Added:** 2025-12-30  
**Updated:** 2025-12-30

## Summary

Introduce a dedicated meshing worker (or worker pool later) that generates
chunk-local surface geometry using **greedy meshing**.

This design upgrades rendering from v1 “frontier instancing” to v2
“surface meshing” while preserving the architecture rules:

- Simulation owns canonical world rules (procedural base + sparse edits).
- Rendering is visibility-driven (DEC004): only exposed faces become geometry.
- Meshing is pure, worker-friendly, and uses typed arrays in/out (TECH001).

## References (source of truth)

- `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- `docs/ARCHITECTURE/TECH002-voxel-world-model.md`
- `docs/ARCHITECTURE/TECH003-voxel-chunk-representation-and-render-adapters.md`
- `docs/ARCHITECTURE/DEC003-procedural-base-plus-edits.md`
- `docs/ARCHITECTURE/DEC004-render-visibility-driven-and-chunk-caches.md`
- `docs/ARCHITECTURE/DEC005-greedy-meshing-for-block-voxel-surfaces.md`

## Goals

- Generate surface geometry proportional to exposed faces (not volume).
- Make mesh generation **off-main-thread** by default (TECH001 guidance).
- Keep meshing code pure TypeScript:
  - no `three` imports
  - no DOM/WebGL APIs
- Keep update cost bounded and localized:
  - voxel edit dirties at most the owning chunk plus boundary neighbors
- Use transferables and typed arrays to avoid GC spikes.
- Make the system modular:
  - renderer can swap algorithms later (greedy → other)
  - storage backend can evolve independently (DEC003 remains source of truth)

## Non-goals (v1)

- Perfect LOD, greedy-merge across chunk boundaries.
- Persistence/serialization format.
- Lighting, AO, smooth terrain (surface nets/marching cubes).

## High-level architecture

```mermaid
flowchart LR
  Sim[Sim Worker (Engine)] -->|VoxelEdit[] + dirtyChunks| Main[Main Thread]
  Main -->|MeshingJob (chunkId + materials)| MeshW[Meshing Worker]
  MeshW -->|MeshResult (typed arrays)| Main
  Main -->|update BufferGeometry| Three[Three/R3F]
```

Key idea: the meshing worker boundary is *chunk → geometry buffers*.

## Chunk addressing

### Chunk size

- `CHUNK_SIZE = 16` (aligns with TECH002/TECH003)

### Chunk coords

- Chunk coordinate: `(cx, cy, cz)` where:
  - `cx = floor(x / CHUNK_SIZE)` etc.

### Chunk id encoding (for protocol / worker routing)

Use a packed integer encoding for `dirtyChunks` and meshing job routing.

Options:

- **Option A (simple v1):** keep string key `"cx,cy,cz"` on main thread and only
  pack to an `Int32Array` later.
- **Option B (recommended):** pack to 3×`Int32Array` triples or a single
  `Int32Array` with repeating `[cx, cy, cz]`.

This design recommends **B** for simplicity and fewer parsing costs:

- `dirtyChunks: Int32Array` where entries are `cx, cy, cz` repeating.

## Meshing input model

### Why an apron is required

To correctly decide whether a face is exposed at a chunk boundary, the mesher
needs neighbor materials. Without this, chunk edges would either:

- miss faces that should be visible, or
- require cross-chunk reads during meshing.

### Apron size

- 1 voxel on all sides.

### Material field shape

Provide a dense field of materials for:

- `(CHUNK_SIZE + 2)³ = 18³ = 5832` samples

Indexing convention (suggested):

- local coordinates include apron:
  - `lx, ly, lz ∈ [0 .. CHUNK_SIZE + 1]`
  - world voxel `(x, y, z)` maps to local:
    - `lx = (x - baseX) + 1`, etc.

Material encoding:

- `Uint8Array` of length `(CHUNK_SIZE + 2)³`
- values are engine material ids (`AIR=0`, `SOLID=1`, `BEDROCK=2`, …)

## Greedy meshing algorithm (block voxel surfaces)

Greedy meshing should:

- Emit faces only where `mat != AIR` and neighbor is `AIR`.
- Merge maximal rectangles of identical face-type per slice plane.

Implementation best practices:

- Reuse mask buffers (avoid per-slice allocations).
- Keep the output deterministic:
  - stable ordering of faces
  - stable vertex order (consistent winding)
- Prefer building indexed geometry.

## Meshing worker protocol

### Messages

#### To meshing worker

```ts
export type MeshingJob = {
  t: "MESH_CHUNK";
  jobId: number; // monotonically increasing, main-thread assigned
  chunk: { cx: number; cy: number; cz: number; size: number };
  // base world position of chunk origin: (cx*size, cy*size, cz*size)
  origin: { x: number; y: number; z: number };
  // (size+2)^3 materials including 1-voxel apron
  materials: Uint8Array;
  // optional: enable/disable greedy merge or debugging outputs
  opts?: { emitMaterialIds?: boolean };
};
```

#### From meshing worker

```ts
export type MeshResult = {
  t: "MESH_RESULT";
  jobId: number;
  chunk: { cx: number; cy: number; cz: number; size: number };
  // geometry payload (transferable buffers)
  geometry: {
    positions: Float32Array;
    normals?: Int8Array | Float32Array;
    indices: Uint32Array | Uint16Array;
    // optional: per-vertex material ids or colors
    materialIds?: Uint8Array;
  };
};

export type MeshError = {
  t: "MESH_ERROR";
  jobId: number;
  message: string;
};
```

### Transferables

When posting `MeshResult`, transfer the underlying `ArrayBuffer`s:

- `positions.buffer`
- `indices.buffer`
- `normals?.buffer`
- `materialIds?.buffer`

This avoids copying large arrays.

## Dirty chunk routing

### What dirties a chunk

A voxel edit at `(x, y, z)` dirties:

- the chunk containing `(x, y, z)`
- plus neighbor chunks if the edit touches a chunk boundary and changes face
  exposure across that boundary

Rule of thumb (v1):

- Always dirty the owning chunk.
- If `lx==0` also dirty `(cx-1,cy,cz)`, if `lx==size-1` dirty `(cx+1,cy,cz)`.
- Same for y/z boundaries.

### Coalescing

- Maintain a `Set` (or packed map) of dirty chunks per frame.
- Enqueue at most one meshing job per chunk at a time.
- If a chunk is dirtied while a job is in-flight:
  - mark it dirty again and schedule a follow-up job when the in-flight job
    completes (or cancel if you implement cancellation later).

### Stale result protection

Main thread maintains per-chunk `revision`:

- Increment revision each time a chunk is scheduled for remesh.
- Tag jobs with `(chunkId, revision)`; drop results that don’t match current.

This prevents out-of-order worker responses from corrupting visuals.

## Main-thread integration (renderer)

### Render adapter responsibilities

- Own the Three `BufferGeometry` per chunk.
- Apply `MeshResult` buffers to geometry.
- Dispose old geometry attributes (or reuse) to avoid GPU memory leaks.
- Handle empty meshes (no exposed faces):
  - remove/hide chunk mesh instance.

### Chunk visibility

Even with meshing, do not mesh the entire world:

- Maintain an active chunk radius around player (or camera) to request/maintain.
- When chunk exits the active set:
  - dispose mesh and free bookkeeping

## Performance and memory best practices

- Prefer one meshing worker initially.
- Add a worker pool only when profiling shows meshing is CPU-bound.
- Reuse typed arrays via pooling where feasible.
- Avoid per-frame “build apron field” allocations when possible:
  - reuse a `Uint8Array(18^3)` scratch buffer per chunk job

## Testing strategy

- Unit test greedy meshing on tiny synthetic fields (e.g., 4³) to validate:
  - face visibility rule
  - rectangle merging correctness
  - consistent winding
- Integration tests for dirty chunk calculation:
  - boundary edits dirty neighbor chunks
- Worker protocol tests:
  - transferables used (where testable)
  - stale results dropped via revision check

## Rollout plan

1. Keep frontier rendering as v1 default in production while meshing is behind a
   config flag (`render.voxels.mode = "meshed"` or similar).
2. Implement meshing worker + minimal main-thread mesh adapter.
3. Profile:
   - ensure no main-thread jank during remesh bursts
   - validate memory doesn’t grow unbounded
4. Make meshing the default once stable.
