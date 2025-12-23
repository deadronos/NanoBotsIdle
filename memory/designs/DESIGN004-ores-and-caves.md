# DESIGN004 — Ores & Cave Generation

**Status:** Proposed  
**Added:** 2025-12-23  
**Author:** GitHub Copilot

---

## Summary

Add deterministic cave carving and ore vein generation to the world generator so players have meaningful underground exploration and resource progression. Keep generation chunk-local and deterministic by seed, preserve the repo's bounded-per-frame and chunked design, and make the logic testable and easy to tune.

## Motivation & Goals

- Provide exploration targets (caves, caverns) and resource nodes (coal, iron, gold, diamond) to enable mining progression and crafting.
- Keep generation deterministic (seed + chunk coords) so worlds are reproducible.
- Preserve performance and keep generation chunk-local so terrain streaming remains smooth.

**Out of scope (for this design):** fluid seepage into caves (covered in later fluids design), elaborate cave biomes (future enhancement), or major LOD/meshing changes.

---

## Requirements (EARS-style)

1. WHEN a chunk is generated, THE SYSTEM SHALL carve caves within a configurable vertical range using deterministic 3D noise or tunnel algorithms.  
   **Acceptance:** Repeated generation with identical seed and chunk coords yields the same carved air blocks; a unit test verifies determinism for sample seeds.

2. WHEN a chunk is generated, THE SYSTEM SHALL place ore veins (coal, iron, gold, diamond) according to configurable depth ranges and per-chunk attempt rates.  
   **Acceptance:** A distribution test ensures ore counts per-area fall within configured tolerances and are deterministic by seed.

3. WHEN adjacent chunks are generated in any order, THE SYSTEM SHALL produce seam-consistent caves and ore placement (no mismatched overlaps or discontinuities).  
   **Acceptance:** Generate adjacent chunks and assert boundary voxels match reproduced generation.

4. WHEN generation is expensive, THE SYSTEM SHALL allow offloading expensive passes to a worker thread or limit CPU work per frame to keep the main thread responsive.  
   **Acceptance:** Chunk generate time is within a reasonable bound or workerized with no frame spikes observed in manual profiling.

---

## Non-functional considerations

- Determinism: rely on existing `seed` + `hash2`/`fbm` primitives where possible.
- Performance: generation must be chunk-bounded and fast; expensive passes (caves/veins) should be designed to be offloaded into a worker.
- Testability: expose deterministic outputs for unit tests (e.g., `generateCavesInto(chunk)` returns the set of carved positions for assertion).

---

## Design overview

Extend the chunk generation pipeline in `World.generateTerrainInto` with two new passes:

HeightmapPass → CavePass → StrataPass → OrePass → FeaturePass (trees, bushes)

- CavePass: carve out tunnels & caverns using seeded 3D noise or a hybrid technique (many projects use 3D FBM thresholding + tunneling random walks). Carving writes Air into candidate voxels.
- OrePass: place veins by performing N seeded attempts per chunk per ore type; for each attempt, perform a short random-walk or blob growth replacing only configured replaceable blocks (default: Stone).

Both passes are deterministic using the world seed and the chunk coordinates.

### Parameters / Config

Add to `WorldOptions` (or a `WorldGenerationConfig` nested struct):

- cavesEnabled: boolean
- caveNoiseScale: number
- caveThreshold: number
- caveMinY / caveMaxY: number
- caveProtectSurface: boolean (avoid shallow holes)

- ores: OreConfig[]

Type `OreConfig`:

```ts
type OreConfig = {
  id: BlockId;               // block to place (e.g., Coal)
  minY: number;              // inclusive
  maxY: number;              // inclusive
  attemptsPerChunk: number;  // tries per chunk
  veinSizeMin: number;
  veinSizeMax: number;
  replaceable?: BlockId[];   // default: [BlockId.Stone]
  biomeMultiplier?: Record<string, number>; // optional if biomes exist
}
```

### Cave algorithm (proposal)

- Use an FBM / ridged 3D noise function sampled at a configurable scale.
- For each voxel (x,y,z) in a chunk, compute noise = fbm3((wx+seed)*scale, (y+seed)*scale, (wz-seed)*scale).
- If noise > threshold && y in [caveMinY, caveMaxY] carve to Air (subject to `protectSurface`).
- Optional: for tunnel features, run a number of seed random-walk tunnels per chunk that carve a linear tunnel with radius.

Pros: simple, GPU friendly, deterministic. Cons: noisy wide cave shapes; consider hybrid if later user feedback requests "tunnel" style.

### Ore algorithm (proposal)

- For each ore config per chunk, run `attemptsPerChunk` attempts.
- Each attempt picks (x,y,z) uniformly in chunk within ore min/max; if that block is replaceable, start a vein using a small random-walk limited to `veinSize` placing ore blocks along the path.
- Use seeded RNG based on (seed,cx,cz,oreId,attemptIndex) to ensure deterministic placement independent of generation order.

---

## Integration & repository invariants

- Adding ores requires updating `src/voxel/World.ts`: add new `BlockDef` entries and expand `BlockId` enum. **Remember invariants** in `AGENTS.md`: when adding a block update `BLOCKS`, `BlockId`, `INVENTORY_BLOCKS` (if you want pickable), atlas tiles (`src/voxel/atlas.ts`) and UI icons.
- Update `src/game/items.ts` and `src/ui/*` to allow ores to appear in inventory/hotbar.

---

## Tests

- Determinism tests: generate the same chunk multiple times with same seed and assert exact block buffer equality for carved air and ore placement.
- Distribution tests: sample many chunks with a given seed and assert ore counts by type fall within configured tolerance.
- Boundary tests: generate adjacent chunks (A,B) independently and ensure voxel values along the shared face(s) are identical.
- Performance test: measure generation time for a chunk in CI or local test harness and compare with baseline.

---

## Tasks (implementation plan, recommended small steps)

1. **Config & types** — Add `OreConfig` and cave options to `WorldOptions`. Add docs and small unit tests. (0.5–1 day)
2. **Block additions** — Add ore blocks (Coal, Iron, Gold, Diamond) to `BLOCKS` + atlas tiles and inventory icons; add brief unit test to assert tile exists. (0.5 day)
3. **CavePass implementation** — Implement `generateCavesInto(c: Chunk)` with deterministic noise thresholding; add unit tests for determinism and seam integrity. (1–2 days)
4. **OrePass implementation** — Implement `generateOresInto(c: Chunk)` with seeded attempts + random-walk veins; add distribution and seam tests. (1–2 days)
5. **Profile & workerize** — If chunk gen causes spikes, move expensive passes into a web worker and return full block buffers. Add tests/integration harness for worker path. (1–2 days)
6. **Polish** — Add config flags, tune default constants, and update docs + memory/tasks entries. (0.5 day)

---

## Acceptance criteria

- Unit tests for determinism, seam consistency, and ore distribution pass.
- Generation remains chunk-local and deterministic for fixed seeds.
- Chunk generation cost is bounded; workerization available if necessary.
- Ores appear in-game, show tiles in atlas and inventory, and are collectible with existing block break logic.

---

## Risks & open questions

- Performance: naive full 3D passes can be expensive for tall/large chunks — mitigate via worker or lower frequency sampling.
- Surface holes: caves near surface can be disruptive; default `caveProtectSurface` should be true.
- Interaction with fluids: later fluid seep into cave systems is a non-trivial interaction scoped to another design.

---

**Next step:** create tasks in `/memory/tasks` (TBD) and a minimal POI PR that adds one ore type + a simple cave pass for quick feedback.
