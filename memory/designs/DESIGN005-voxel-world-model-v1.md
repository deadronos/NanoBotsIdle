# [DESIGN005] Voxel World Model v1 (Procedural Base + Sparse Edits + Frontier)
**Status:** Proposed  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Summary
Implement a true 3D voxel world model for NanoBotsIdle that supports:

- true digging (mine downward, not just surface blocks)
- frontier-only mining (a voxel is mineable only if it has an air neighbor)
- definitive bedrock (prevents infinite depth/falling; indestructible)
- soft-lock prevention: guarantee enough above-water mineable blocks for prestige runs

The world is represented as:

- a deterministic procedural base (column fill from a 2D surface function), plus
- a sparse edits overlay (mined/placed overrides)

This design implements `docs/ARCHITECTURE/TECH002-voxel-world-model.md` in code-level terms.

## References (source of truth)
- `docs/ARCHITECTURE/TECH002-voxel-world-model.md`
- `docs/ARCHITECTURE/GAME001-progression-loop.md`
- `docs/ARCHITECTURE/DEC003-procedural-base-plus-edits.md`
- `docs/ARCHITECTURE/DEC001-main-thread-player-collision.md`

## Current state (gap)
Today, the “world” is effectively a surface heightmap rendered as instanced cubes:

- Mining hides a surface cube instance in `World.tsx`.
- Player collision is height-based and does not account for mined blocks.
- There is a visual-only “bedrock” plane.

We need to upgrade to a 3D field query `materialAt(x,y,z)` and authoritative edits.

## Goals
- Minimal memory growth: don’t allocate full 3D chunks initially; use sparse edits.
- Deterministic world generation per prestige seed.
- Efficient incremental updates:
  - when a voxel changes, only that voxel + its 6 neighbors need frontier re-eval
  - dirty chunk computation should be cheap
- Work in Worker + main-thread collision proxy (shared pure functions).

## Non-goals (v1)
- Caves, overhangs, ores by noise volumes, fluids simulation.
- Underwater drones (starter drones are above-water only for now).
- Advanced meshing (greedy meshing/surface nets) immediately.

## World representation (engine-side)
### Materials
Use small integer ids in the engine:

- `AIR = 0`
- `SOLID = 1`
- `BEDROCK = 2`
- (optional later) `WATER = 3` (we can keep water as a plane early on)

Renderer maps material ids to colors/materials (no `three` in engine).

### Base world (procedural)
For a given `(x,z)`:

- `surfaceY = surfaceHeight(x, z, seed)` (quantized)
- base material:
  - `y <= bedrockY` → `BEDROCK`
  - `bedrockY < y <= surfaceY` → `SOLID`
  - else → `AIR` (and optionally water above `waterLevel`)

### Sparse edits overlay
Maintain an edits map:

```ts
// v1: string keys are fine; upgrade to packed int keys later if needed
type Key = string; // `${x},${y},${z}`
type Material = number;

edits: Map<Key, Material>
```

Final query:

```ts
materialAt(x,y,z) = edits.get(key(x,y,z)) ?? baseMaterialAt(x,y,z)
```

### Bedrock rule (definitive)
Bedrock is authoritative:
- Mining bedrock is rejected.
- Collision treats bedrock as solid.

Config target: a fixed value like `bedrockY = -50` (tunable via `src/config`).

## Frontier mining (mineable predicate)
A voxel is mineable iff:

1. `materialAt(x,y,z) === SOLID`
2. at least one of the 6 neighbors is `AIR`
3. (starter drones constraint) `y >= waterlineVoxelY`

### Frontier sets (engine-maintained)
Maintain:
- `frontierSolid: Set<Key>`
- `frontierAboveWater: Set<Key>` (subset used by starter drones)

On any voxel edit, re-evaluate membership for:
- the edited voxel
- its 6 neighbors

This keeps mining queries and target selection fast.

## Soft-lock prevention (prestige)
Prestige should never soft-lock a run where starter drones can’t reach 50 mined blocks.

Observation: in the base world, the initial mineable frontier above water is (primarily) the set of surface voxels with `surfaceY >= waterlineVoxelY`.

On world init:
- compute `aboveWaterSurfaceCount` by scanning `(x,z)` in the active radius
- if count < `prestige.minAboveWaterBlocks`, retry with a different seed (deterministically) up to `terrain.genRetries`

This avoids expensive 3D scans while meeting the gameplay guarantee.

## Rendering approach (v1, compatible with current instancing)
We need something that visually communicates digging depth without implementing full meshing immediately.

### Option A (recommended v1): render frontier voxels only
- Renderer maintains a dynamic instanced mesh of “visible” frontier voxels (cubes).
- Engine sends voxel edits + (optionally) explicit “frontier add/remove” lists.
- Renderer keeps a `Map<Key, instanceIndex>` and a `keysByIndex[]` array to support:
  - add: allocate next free index
  - remove: swap-with-last and shrink count (or scale-to-zero)

This yields:
- initial world looks like today (surface cubes)
- digging reveals deeper cubes as they become frontier

### Option B: render chunks + dirty chunk rebuild
Supported by the architecture, but can be deferred until profiling demands it.

## Main-thread collision proxy (player responsiveness)
Per `DEC001`, the main thread owns collision resolution, but must remain consistent with the authoritative world.

Approach:
- Share the same `baseMaterialAt()` and `surfaceHeight()` functions as pure TS.
- Mirror voxel edits from Worker deltas into a local edits map.
- For ground collision (v1), compute topmost solid under `(x,z)`:
  - start at `surfaceY(x,z)` and scan downward until a solid voxel is found or bedrock is hit
  - this is bounded by `surfaceY - bedrockY` (≈ 50–80), cheap for one player

## Config knobs (must live in `src/config/*`)
- `terrain.worldRadius`
- `terrain.waterLevel` (+ `waterlineVoxelY` derivation)
- `terrain.bedrockY`
- `terrain.genRetries`
- `prestige.minAboveWaterBlocks` (currently 50; must be configurable)

## Acceptance criteria (v1)
- Player and drones can dig downward; mined voxels become `AIR`.
- Mining is rejected if a voxel has no air neighbor.
- Bedrock cannot be mined and prevents falling into infinite depth.
- A new prestige world always has at least `prestige.minAboveWaterBlocks` mineable above-water voxels.
- Main-thread collision reflects mined edits (no “invisible ground” on mined columns).

