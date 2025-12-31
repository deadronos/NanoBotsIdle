# DEC007: LOD and Culling for Chunk Meshes

**Status:** Implemented (Phase 1-3), Optional occlusion disabled by default

## Context

The voxel world renders thousands of chunk meshes. Without visibility management, all meshes are rendered every frame regardless of distance or camera orientation, causing excessive draw calls.

## Decision

Implement a layered visibility system:

1. **Distance-based LOD** — Chunks beyond `lowDistanceMultiplier × chunkSize` use downsampled geometry. Chunks beyond `hideDistanceMultiplier × chunkSize` are hidden.

2. **Frustum culling** — Chunks outside camera frustum are hidden regardless of distance.

3. **Optional occlusion culling** — WebGL2 occlusion queries can hide chunks behind other geometry. Disabled by default due to async query complexity.

## Configuration

Located in `config.render.voxels`:

```typescript
lod: {
  lowDistanceMultiplier: 12,   // Switch to low LOD at 12 × chunkSize
  hideDistanceMultiplier: 24,  // Hide at 24 × chunkSize
},
occlusion: {
  enabled: false,              // Opt-in experimental feature
  queryDelayFrames: 2,         // Frames to wait for query result
  maxQueriesPerFrame: 16,      // Budget per frame
}
```

## Implementation Files

| File | Purpose |
|------|---------|
| `src/render/lodUtils.ts` | LOD selection and visibility application |
| `src/render/frustumUtils.ts` | Cached frustum helper with sphere intersection |
| `src/render/lodGeometry.ts` | Geometry swapping based on LOD level |
| `src/render/occlusionCuller.ts` | WebGL2 occlusion query pool (optional) |
| `src/meshing/greedyMesher.ts` | `downsampleMaterials` for low LOD generation |
| `src/meshing/workerHandler.ts` | Worker emits both high and low LOD geometries |

## Performance Impact

- **Frustum culling**: Immediate draw call reduction for off-screen chunks
- **Distance hiding**: Large reduction for distant terrain
- **LOD downgrade**: Reduced vertex count for mid-distance chunks
- **Occlusion**: Minimal additional gain in dense scenes (disabled by default)

## Consequences

- Low LOD geometry is coarser (2× downsampled voxels) — acceptable for distant chunks
- Occlusion queries are async — may show chunks for 2-3 frames before hiding
- Config-driven thresholds allow tuning without code changes
