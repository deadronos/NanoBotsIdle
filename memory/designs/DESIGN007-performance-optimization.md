# DESIGN007 - Performance Optimization and Reusable Systems

**Status:** Proposed  
**Added:** 2025-12-23  
**Author:** Codex (GPT-5)

---

## Summary

Review the current voxel pipeline and introduce reusable performance systems that scale as new components and systems are added. Focus on chunk streaming and meshing, render batching/instancing, and memory pooling to reduce CPU time, draw calls, and GC churn while preserving existing world invariants.

## Motivation and Goals

- Keep frame time stable as world size and feature count grow.
- Avoid GC spikes from frequent geometry rebuilds and transient allocations.
- Provide reusable systems (scheduler, pools, render batches) that future components can adopt without custom plumbing.
- Preserve existing per-frame caps and world invariants.

---

## Requirements (EARS-style)

1. WHEN the player crosses a chunk boundary, THE SYSTEM SHALL recompute streaming sets and enqueue chunk jobs once per boundary change to avoid per-frame scanning.  
   **Acceptance:** chunk streaming work occurs only when the player enters a new chunk or view distance changes.

2. WHEN a chunk mesh is rebuilt, THE SYSTEM SHALL reuse buffer allocations from a pool and update existing geometry attributes rather than disposing and reallocating each time.  
   **Acceptance:** geometry allocation counters show stable reuse during repeated edits in a region.

3. WHEN multiple instances of the same renderable appear (items, mobs, particles), THE SYSTEM SHALL batch them using instanced rendering or a shared points pipeline to keep draw calls bounded.  
   **Acceptance:** draw calls scale sublinearly as entity counts increase (measured in devtools).

4. WHEN chunk meshing runs, THE SYSTEM SHALL minimize per-voxel world lookups using chunk-local views and neighbor caches (or greedy meshing) to reduce CPU cost.  
   **Acceptance:** meshing time per chunk decreases relative to the current baseline with the same view distance.

5. WHEN background work exceeds the per-frame budget, THE SYSTEM SHALL throttle chunk generation, lighting, and mesh swaps while keeping gameplay responsive.  
   **Acceptance:** no long-frame spikes during rapid movement; bounded work continues across frames.

---

## Current Observations (performance hot spots)

- `World.ensureChunksAround(...)` is called every frame and scans the full view square (289 chunks at viewDistance=8).
- `buildChunkGeometry(...)` does a full voxel scan per dirty chunk with frequent `world.getBlock` and `world.getLightAt` calls.
- Meshing allocates new JS arrays and `BufferGeometry` each rebuild; `rendering.ts` disposes and replaces geometry every time.
- `pickBlockDDA(...)` and `PlayerController.update(...)` allocate temporary vectors each frame.
- `BreakParticleSystem` allocates new vectors per particle and rebuilds arrays each update.
- Lighting propagation uses dynamic arrays and `slice` compaction that can churn during heavy updates.

---

## Proposed Optimization Systems (reusable components)

### 1) Frame Budget Scheduler

A small scheduler that caps work per frame and is shared by chunk generation, lighting propagation, mesh swaps, and ECS tasks.

```ts
type BudgetedJob = { id: string; cost: number; run: () => void };
type FrameBudget = { ms: number; maxJobs: number };
```

Benefits:
- Consistent frame time.
- Easy to plug in new systems with a shared contract.

### 2) Chunk Pipeline (streaming + jobs)

Event-driven streaming that triggers only on chunk boundary changes.

Pipeline stages:
- Stream: determine needed chunks on boundary change.
- Generate: build chunk blocks and lighting (worker-ready).
- Mesh: build mesh data (worker-ready).
- Swap: apply geometry updates with pool reuse.

```text
Player moves -> ChunkBoundaryChange -> StreamSetDiff -> JobQueue
  Generate -> Light -> Mesh -> Swap
```

Benefits:
- Reduces per-frame scanning.
- Provides a clear place to add LOD or distance-based throttling.

### 3) Geometry and TypedArray Pools

Reuse `BufferGeometry` and typed arrays across chunk rebuilds.

```ts
type MeshBuffers = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
};
```

Benefits:
- Lowers GC pressure.
- Provides a shared pool for any system emitting geometry.

### 4) Chunk Mesher Improvements

Options (ordered by impact):
- Greedy meshing to reduce face count and vertex throughput.
- Chunk-local accessors to avoid `world.getBlock` per face.
- Precompute neighbor border slices to speed visibility tests.
- Light sampling via local arrays or packed light cache.

Benefits:
- Large CPU reduction per rebuild.
- Smaller GPU payload for distant views.

### 5) Render Batching and Instancing

Introduce a reusable batching API for non-chunk renderables.

```ts
type InstanceBatch = {
  key: string;
  mesh: THREE.InstancedMesh;
  capacity: number;
  setInstance(i: number, transform: Matrix4, color?: Color): void;
};
```

Use cases:
- Items and mobs: instanced mesh with shared material.
- Particles: `THREE.Points` with pooled attributes or GPU sprite system.

Benefits:
- Bounded draw calls as entity count grows.
- A single pipeline for future entity types.

### 6) Worker Offload (optional phase)

Move chunk generation and meshing to a worker using transferable typed arrays.

Benefits:
- Removes the largest CPU work from the main thread.
- Keeps input and rendering responsive during heavy streaming.

---

## Data Flow Diagram

```mermaid
flowchart LR
  Player --> Stream[Chunk Streaming]
  Stream --> Jobs[Job Queue]
  Jobs --> Generate[Generate Blocks]
  Generate --> Light[Light Init/Update]
  Light --> Mesh[Build Mesh Data]
  Mesh --> Swap[Geometry Swap]
  Swap --> Render[Render Batches]
```

---

## Error Handling Matrix

| Area | Error | Response | Notes |
| --- | --- | --- | --- |
| Worker jobs | Worker fails or times out | Fallback to main-thread job with budget cap | Log once, keep playing |
| Geometry pool | Pool exhausted | Allocate new buffers, track warning | Pool can grow next frame |
| Mesh data | Invalid counts or NaNs | Drop mesh update and keep old geometry | Avoid crash on bad data |
| Streaming | Missing chunk in pipeline | Re-enqueue generate job | Prevent gaps |

---

## Testing Strategy

- Unit tests for chunk boundary detection and stream-set diff logic.
- Unit tests for mesher output sizes and consistency with known patterns.
- Worker payload tests (serialize/deserialize) if worker phase is adopted.
- Perf validation: collect timings for meshing, swaps, and lighting (manual + devtools).

---

## Implementation Plan (phased)

1. **Baseline and instrumentation**  
   Add lightweight timing counters for meshing, lighting, and swaps. Capture draw calls in devtools.

2. **Streaming triggers + scheduler**  
   Replace per-frame `ensureChunksAround` with boundary-based streaming. Introduce a shared frame-budget scheduler.

3. **Geometry pool + mesh swap reuse**  
   Update chunk renderer to reuse `BufferGeometry` and typed arrays.

4. **Mesher optimization**  
   Implement greedy meshing or chunk-local neighbor caching and measure gains.

5. **Instance batching**  
   Build `InstanceBatch` system for mobs/items/particles and migrate systems to use it.

6. **Worker offload (optional)**  
   Move generate/mesh to worker if main-thread remains a bottleneck.

---

**Next step:** confirm baseline profiling targets and choose the first phase to implement.
