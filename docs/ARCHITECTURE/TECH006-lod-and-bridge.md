# TECH006: Chunk LOD and Typed Bridge

**Status:** Implemented
**Date:** 2026-01-01

## 1. Distance-Based Chunk LOD

To manage rendering performance in large voxel worlds, we implemented a Level of Detail (LOD) system for the Instanced Rendering layer.

### Strategy

-   **Centric Check:** Every frame, `VoxelLayerInstanced.tsx` calculates the player's current chunk coordinate (`pcx, pcz`).
-   **Radius Scan:** Iterates over chunks in a concentric radius using `forEachRadialChunk`.
-   **Actions:**
    -   **LOD0 (Range < 6 chunks):** High fidelity. Loads full `InstancedMesh` via `addChunk()`.
    -   **LOD1/2 (Range 6-12 chunks):** Low fidelity.
        -   Calls `removeChunk()` on the instanced manager to free GPU buffers.
        -   Renders a `SimplifiedChunk` (currently a lightweight proxy mesh) instead.
    -   **Unload (Range > 12 chunks):** Explicit cleanup loop ensures chunks outside the processing radius are completely unloaded from memory.

### Optimization Gains

-   Reduces draw calls and instance count by >75% for distant terrain.
-   Maintains gameplay clarity (you can still see distant terrain structure) without the cost of millions of voxels.

## 2. Zod-Typed Worker Bridge

We replaced raw TypeScript interfaces with runtime-validated schemas using [Zod](https://zod.dev/) to prevent "silent failures" in the Web Worker communication bridge.

### Schemas (`src/shared/schemas.ts`)

Mirrors the `protocol.ts` types but adds runtime validation:
-   `SimToMainMessageSchema`: Validates `READY`, `FRAME` (with `RenderDelta`), `ERROR`.
-   `MainToSimMessageSchema`: Validates `INIT`, `STEP` (with `Cmd` array).

### Integration

-   **Main Thread (`simBridge`):** Wraps `worker.onmessage` handlers. Invalid payloads log a clear error and are dropped, preventing undefined behavior in the renderer.
-   **Worker Thread (`sim.worker`):** Validates inputs before processing. Malformed commands throw immediate errors back to main thread.

### Benefits

-   **Type Safety:** `TypeScript` static types are now enforced at runtime.
-   **Debuggability:** Schema errors provide precise paths to invalid fields (e.g. `frame.delta.outposts: unexpected type`).
