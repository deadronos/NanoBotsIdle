# [TASK005] - Implement DESIGN004 Ores + Cave Generation

**Status:** Completed  
**Added:** 2025-12-23  
**Updated:** 2025-12-23

## Original Request

create a /memory/tasks implementation plan for DESIGN004 and execute that, use best practices

## Thought Process

- Use `memory/designs/DESIGN004-ores-and-caves.md` as the source of truth for requirements and sequencing.
- Keep generation deterministic by seed + world coords; avoid chunk-local seams by sampling noise in world space.
- Preserve repo invariants (block IDs, per-frame rebuild caps, atlas tile IDs).
- Add ore blocks to atlas/UI inventories so players can see and place what they mine.
- Add focused logic tests (determinism + order independence + depth range) to avoid regressions.

## Requirements (EARS)

1. WHEN a chunk is generated, THE SYSTEM SHALL carve caves within a configurable vertical range using deterministic 3D noise.  
   **Acceptance:** same seed + chunk coords produce identical blocks; cave air appears below surface in sample chunks.
2. WHEN a chunk is generated, THE SYSTEM SHALL place ore veins (coal, iron, gold, diamond) using deterministic attempts and depth ranges.  
   **Acceptance:** ore counts are deterministic for a fixed seed; ores appear only within configured depth ranges.
3. WHEN adjacent chunks are generated in any order, THE SYSTEM SHALL produce seam-consistent caves and ore placement.  
   **Acceptance:** generating chunks in different orders yields identical block buffers for each chunk.
4. WHEN generation config values are invalid (e.g., minY > maxY), THE SYSTEM SHALL clamp to safe defaults without throwing.  
   **Acceptance:** unit tests cover clamping paths; generation completes without errors.

## Design Notes

- Reference: `memory/designs/DESIGN004-ores-and-caves.md`.
- Generation passes: Heightmap -> Caves -> Ores -> Features (trees).
- Shared context includes seed, chunk coords, base world coords, heightmap, config, RNG.
- Each pass uses `rng.fork(passId)` for order-independent determinism.

## Error Matrix

| Scenario | Detection | Response | Notes |
| --- | --- | --- | --- |
| Invalid Y range (minY > maxY) | Config normalization | Swap/clamp to valid range | Avoids exceptions in hot loops |
| Y outside chunk bounds | Bounds check in generation loops | Skip placement/carving | Keeps chunk-local writes safe |
| Non-replaceable block for ore | Replaceable guard | Skip placement step | Prevents overwriting non-stone blocks |
| Caves above surface when protected | Height map + protectSurface check | Skip carve | Preserves surface integrity |

## Unit Testing Strategy

- Determinism tests: identical seed + coords produce identical blocks.
- Order independence tests: generating adjacent chunks in different orders yields identical buffers.
- Depth range tests: ores only appear between minY/maxY for each ore config.

## Implementation Plan

- Add seeded RNG helper and 3D noise utilities for cave generation.
- Add generation config types + defaults, including cave + ore parameters and validation.
- Refactor `World.generateTerrainInto` into deterministic passes (heightmap, caves, ores, features).
- Add ore blocks (coal, iron, gold, diamond) with atlas tiles and inventory support.
- Add vitest coverage for determinism/order independence/depth ranges.
- Run targeted tests and update task progress.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Add RNG + 3D noise helpers and config validation | Complete | 2025-12-23 | |
| 1.2 | Implement generation passes (heightmap, caves, ores, features) | Complete | 2025-12-23 | |
| 1.3 | Add ore blocks + atlas tiles + inventory updates | Complete | 2025-12-23 | |
| 1.4 | Add deterministic generation tests | Complete | 2025-12-23 | |
| 1.5 | Run tests and record results | Complete | 2025-12-23 | `npm test -- --run src/voxel/generation.test.ts` |

## Progress Log

### 2025-12-23

- Created TASK005 with requirements, plan, and initial subtasks.
- Implemented deterministic generation passes with caves + ores and config validation.
- Added ore block definitions, atlas tiles, and inventory listings.
- Added vitest coverage for determinism, order independence, and ore depth ranges.
- Ran `npm test -- --run src/voxel/generation.test.ts`.
