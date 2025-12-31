# DEC005: Prefer Greedy Meshing for Block-Voxel Surface Rendering

**Status:** Accepted  
**Last updated:** 2025-12-30

## Context

The repo’s world model is discrete “block voxels” (material ids on an integer
grid), with a procedural base and sparse edits (DEC003). Rendering must remain
visibility-driven by default (DEC004) and should avoid expanding chunk volumes
into interior voxel geometry.

As the visible surface area grows, even frontier instancing can become
insufficient. We need a surface-rendering approach that:

- produces geometry proportional to exposed faces
- supports chunk-local dirty rebuilds
- has a clean Worker boundary (typed arrays in/out)

Several surface approaches exist (naive face meshing, greedy meshing, surface
nets, marching cubes). For block voxels, greedy meshing is the simplest and most
effective first choice.

## Decision

Adopt **greedy meshing** as the preferred first surface-meshing algorithm for
chunk-local rendering.

- Greedy meshing merges adjacent coplanar faces of identical material, reducing
  vertex/triangle counts dramatically compared to naive face-per-voxel.
- It maps naturally to per-chunk jobs and transferable typed-array outputs.

Surface nets / marching cubes may be considered later if the world model evolves
into smooth scalar fields; they are not prioritized for block voxels.

## Consequences

- The “v2 render adapter” roadmap in TECH003 should prioritize greedy meshing.
- Dirty-chunk scheduling and a clean meshing Worker boundary become core
  architectural primitives.
- Mesh generation code must be pure (no Three imports), with typed-array IO.

## References

- `TECH001-sim-render-separation.md`
- `TECH002-voxel-world-model.md`
- `TECH003-voxel-chunk-representation-and-render-adapters.md`
- `DEC003-procedural-base-plus-edits.md`
- `DEC004-render-visibility-driven-and-chunk-caches.md`
