## TECH002: Voxel World Model (True 3D Digging)

**Status:** Draft (intended target architecture)  
**Last updated:** 2025-12-29

## Summary

The world is represented as a 3D voxel field with indestructible bedrock and
authoritative voxel edits. Terrain is generated deterministically from a seed
and a 2D surface function, then modified over time through mining/building.

The simulation owns the canonical world model. The main thread maintains a
read-only collision proxy that mirrors voxel edits.

## Coordinate system

- Voxels live on an integer grid `(x, y, z)`.
- Chunking is used for addressing and mesh rebuild scheduling.
  - Recommended `CHUNK_SIZE`: 16.

For details on chunk representation tradeoffs (dense formats vs sparse/procedural)
and how rendering should avoid expanding the world into full voxel volumes, see:

- `TECH003-voxel-chunk-representation-and-render-adapters.md`

## Materials

Materials are engine-defined integers (renderer maps them to colors/materials).

- `AIR`: empty
- `SOLID`: mineable terrain
- `WATER`: optional material (can also be rendered as a plane early on)
- `BEDROCK`: indestructible floor (prevents infinite falling)

## Procedural base world + edits overlay

The world is computed as:

1. **Procedural base**: deterministic terrain column fill:
   - `surfaceY = surfaceHeight(x, z, seed)` (quantized)
   - for `y <= bedrockY`: `BEDROCK`
   - for `bedrockY < y <= surfaceY`: `SOLID`
   - else: `AIR` (plus optional water layer)
2. **Sparse edits overlay**:
   - mined voxel: override to `AIR`
   - placed voxel: override to `SOLID` (or a specific material id)

Final material query:

```ts
materialAt(x, y, z) = edits.get(key(x, y, z)) ?? baseMaterialAt(x, y, z);
```

This keeps memory usage low and makes syncing to main thread cheap (ship edits,
not entire chunks).

## Bedrock as definitive gameplay rule

- Bedrock is not merely a visual plane.
- Rules:
  - `y <= bedrockY` is always `BEDROCK`.
  - Mining bedrock is rejected.
  - Collision treats bedrock as solid.

Bedrock should be placed low enough to guarantee at least ~50 blocks of
mineable depth below typical surface for early progression.

## Mining rules (frontier-only)

Mining is allowed only when:

- target voxel is `SOLID` (not `BEDROCK`)
- target voxel has at least one 6-neighbor that is `AIR`

This prevents mining fully enclosed voxels and keeps progression visually
coherent.

### Frontier tracking

The engine maintains a frontier set:

- `frontierSolid`: solid voxels with an air neighbor
- `frontierAboveWater`: subset used by starter drones (see GAME001)

When a voxel changes material, only that voxel and its 6 neighbors need to be
re-evaluated for frontier membership.

## Soft-lock prevention for prestige

World generation must guarantee a minimum number of above-water mineable voxels
to avoid soft locks.

- Target requirement: `prestige.minAboveWaterBlocks > 50` (exact number is a
  config value).
- On world init:
  - compute initial frontier set (or a cheaper approximation)
  - if count is below requirement, retry generation with a different seed and/or
    adjusted bias for up to `terrain.genRetries`

## Starter drone constraint (above water)

Starter drones are restricted to targets above water for now:

- A "starter" drone may only target voxels that satisfy:
  - frontier-only mining rule
  - `y >= waterlineVoxelY` (or similar threshold)

Future drone types can add underwater capability by changing this predicate.
