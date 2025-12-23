# DESIGN006 — Torches, Lighting Propagation & Mob Spawning

**Status:** Proposed  
**Added:** 2025-12-23  
**Author:** GitHub Copilot

---

## Summary

Introduce a lightweight block lighting system (sunlight + block light) with torches as emissive blocks, and implement a mob spawning system that uses light thresholds to decide spawn locations. The light system will be deterministic, chunk-local, and use bounded-update algorithms to keep per-frame cost predictable.

## Motivation & Goals

- Add atmosphere and survival mechanics: torches change gameplay by preventing hostile mob spawns and lighting the environment.
- Provide robust, testable light propagation and an efficient spawn system for mobs that can be tuned to match desired gameplay difficulty.
- Preserve chunked, bounded-per-frame invariants to avoid stalling the main loop.

---

## Requirements (EARS-style)

1. WHEN a torch block is placed or removed, THE SYSTEM SHALL propagate block-light in nearby chunks so visible lighting updates occur within a bounded time and players see immediate lighting changes.  
   **Acceptance:** Add/remove torch and observe neighbor lighting changes (+unit tests to verify local light arrays and expected light levels around the source).

2. WHEN the world state changes (block placement/removal), THE SYSTEM SHALL update both sunlight and block-light in affected areas using a bounded BFS/Flood-fill with attenuation so performance is predictable.  
   **Acceptance:** Light update queue processes work in slices and completes within several frames; unit tests verify light values and propagation correctness.

3. WHEN low-light regions exist at night or underground, THE SYSTEM SHALL allow hostile mobs to spawn on valid ground positions subject to spawn caps and proximity rules.  
   **Acceptance:** Spawn tests ensure mobs only appear when light < threshold and spawn limits are respected.

---

## Design overview

### Data model

- Add per-chunk light arrays (parallel to `chunks.blocks`):
  - `chunk.sunLight: Uint8Array` (0..15)
  - `chunk.blockLight: Uint8Array` (0..15)

- Extend `BlockDef` with `emitLight?: number` (0..15). (Example: Torch emits 14.)

- Add `World.getLightAt(x,y,z): number` helper returning combined light (max of sun and block light) for gameplay queries.

### Propagation algorithm (recommended)

- Use two independent light systems:
  - **Sunlight**: top-down pass. For each column, top cell has sun level 15; sunlight propagates downward until occluded by an occluding block (uses `occludes`/`transparent`). Sunlight also diffuses horizontally when air pockets allow (but simpler approach: downward fill then BFS for lateral spread if needed).
  - **Block light**: when a light source is added/removed, enqueue source with its emission level and perform BFS where neighbor level = sourceLevel - attenuation (attenuation=1) if neighbor transparency allows. Use classical flood-fill approach similar to Minecraft but bounded per-frame.

- Maintain a `lightUpdateQueue` (or dirty set) and process a limited number of updates per game tick (configurable: e.g., `maxLightOpsPerFrame = 2048`). Use incremental propagation so large changes don't stall.

### Integration with meshing

- Add a per-vertex brightness attribute in `buildChunkGeometry` and pass it as `color` or `lightness` buffer so `MeshLambertMaterial` (or a custom shader) can use vertex colors:
  - compute per-vertex brightness as the average of light values of adjacent blocks for that vertex.
  - set `geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))` and use `material.vertexColors = true`.

- Trigger a chunk rebuild when lighting changes materially for that chunk (mark chunk `lightingVersion` and mark dirty if version changed) or update vertex colors in-place when possible to avoid rebuilding geometry.

### Mob spawning (ECS)

- Add `mobSpawnSystem` to ECS that runs periodically (e.g., every X seconds) and considers spawn candidates in loaded chunks:
  - Candidate cell must be air, block below solid, and combined light < `spawnLightThreshold`.
  - Respect per-chunk and global spawn caps and player-proximity rules (don't spawn too near players).
  - Use seeded/random decisions per tick to vary spawn points.

- Spawned mobs are added via `spawnMob(ecs, init)` with basic `mob` component; their AI is handled by existing `mobWanderSystem` and future combat systems.

---

## Tests

- **Light propagation tests**: set up small synthetic chunk(s) and assert expected sun/block light arrays after placing/removing torches and blocks.
- **Edge/Boundary tests**: toggling a block at chunk border must propagate correctly to neighbor chunk's light arrays.
- **Mob spawn tests**: create low-light areas and ensure spawns occur only when conditions are met and spawn counts obey caps.

---

## Implementation plan (small steps)

1. **Per-chunk light arrays** — Add `chunk.sunLight` and `chunk.blockLight` as `Uint8Array` sized to `size.x * size.y * size.z`. Add helper accessors in `World` (e.g., `getBlockLightAt` and `setBlockLightAt`). (0.5–1 day)

2. **Torch config** — Extend `BlockDef` with `emitLight?: number`. Set `Torch` (existing block) to `emitLight: 14`. Update atlas/tooltip if desired. (0.25 day)

3. **Block light BFS** — Implement `propagateBlockLightFrom(sourcePos, level)` with bounded queue and a global `lightUpdateQueue` for incremental updates. Add unit tests for propagation and removal (flood-fill + re-filling). (1–2 days)

4. **Sunlight pass** — Add initial top-down sunlight initialization for new chunks and support incremental updates on block changes that expose/occlude columns. (1 day)

5. **Mesh integration** — Update `buildChunkGeometry` to include vertex color attributes based on per-block lighting; toggle `material.vertexColors = true`. Rebuild chunk when lighting changes or provide a fast vertex attribute update path. (1–2 days)

6. **Mob spawn system** — Implement `mobSpawnSystem` in ECS with configurable thresholds, caps, and spawn frequency. Use `spawnMob()` to add entities. (1–2 days)

7. **Testing & tuning** — Add unit/integration tests and tune `maxLightOpsPerFrame` and spawn params. (1 day)

---

## Acceptance criteria

- Placing/removing a torch updates visible lighting around it consistently and within bounded frames (no extended freezes).
- Sunlight & block light values are deterministic and correctly prevent/allow mob spawns according to thresholds.
- Mesh updates show lighting changes (vertex-level brightness visible) and meshes update in a bounded way.

---

## Performance & risk mitigations

- Keep light propagation incremental and bounded per frame to avoid stuttering; maintain a `dirtyLightSet` and process N updates per frame.
- Consider in-place vertex color updates for small lighting changes to avoid full geometry rebuilds.
- If needed, move heavy recompute steps into a worker and only apply final vertex/lighting data back on main thread.

---

**Next step:** add minimal unit tests that place a torch and assert local blockLight levels, then implement the block-light BFS and wire the torch to start a light update when placed/removed.
