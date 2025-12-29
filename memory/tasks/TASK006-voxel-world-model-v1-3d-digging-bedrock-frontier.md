# [TASK006] - Voxel World Model v1 (3D Digging + Bedrock + Frontier + Prestige Safety)

**Status:** In Progress  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Original Request
Upgrade the world from “surface blocks only” to true 3D digging with:

- mining only allowed when a block has an air neighbor (frontier-only)
- definitive indestructible bedrock (avoid infinite falling)
- starter drones restricted to above-water mining for now
- guarantee enough above-water mineables so the prestige requirement (50 mined blocks) can’t soft-lock a run

## Thought Process
This implements the spec in:

- `docs/ARCHITECTURE/TECH002-voxel-world-model.md`
- `docs/ARCHITECTURE/GAME001-progression-loop.md`
- `memory/designs/DESIGN005-voxel-world-model-v1.md`

We should implement the world model first as procedural base + sparse edits overlay (cheap memory, deterministic), then choose a render adapter that makes digging visible without requiring heavy meshing immediately (render frontier cubes only).

Player collision remains main-thread for responsiveness, but must mirror Worker voxel edits for consistency (per `DEC001`).

## Implementation Plan
- Engine (Worker side):
  - Add `baseMaterialAt(x,y,z)` (column fill via surface height + bedrock).
  - Add `edits` overlay map and `materialAt()` query.
  - Implement `mineVoxel(x,y,z)` with frontier-only rule + bedrock rejection.
  - Maintain `frontierSolid` and `frontierAboveWater` sets incrementally.
  - On init, enforce soft-lock prevention:
    - ensure at least `prestige.minAboveWaterBlocks` above-water mineables by retrying seeds.
- Protocol:
  - Extend delta to include voxel edits and (optionally) frontier add/remove events or dirty chunks.
- Renderer (main thread):
  - Implement v1 voxel renderer that shows frontier voxels using instancing with a dynamic key↔index map.
  - Apply edits/frontier deltas from Worker to add/remove instances.
- Collision proxy (main thread):
  - Mirror voxel edits from Worker into a local edits map.
  - Update `getPlayerGroundHeight()` to account for mined columns by scanning down from surfaceY.
- Config:
  - Add/confirm config knobs in `src/config/*`:
    - `terrain.bedrockY` (e.g., -50)
    - `terrain.genRetries`
    - `prestige.minAboveWaterBlocks` (>= 50)
  - Make drone cost knee and multipliers configurable (ties to GAME001; may overlap TASK003 follow-ups).
- Tests:
  - World query determinism (`materialAt`, `surfaceHeight`).
  - Frontier mineability rules.
  - Bedrock rejection.
  - Soft-lock prevention seed retry behavior.

## Progress Tracking
**Overall Status:** In Progress - 20%

### Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 6.1 | Implement base+edits world query in engine | In Progress | 2025-12-29 | Added `WorldModel` with base + edits and bedrock; mining supports frontier check. |
| 6.2 | Implement frontier tracking + above-water subset | Not Started | - | Incremental neighbor updates. |
| 6.3 | Implement mining command validation + edits output | Not Started | - | Reject non-frontier and bedrock. |
| 6.4 | Implement soft-lock prevention (seed retry) | Not Started | - | Guarantee `minAboveWaterBlocks`. |
| 6.5 | Implement frontier voxel instanced renderer (main thread) | Not Started | - | Dynamic add/remove mapping. |
| 6.6 | Implement collision proxy edits + ground query | Not Started | - | Remove “invisible ground” after mining. |
| 6.7 | Add config + tests for world rules | Not Started | - | Keep tuning in `src/config`. |

## Progress Log

### 2025-12-29
- Created TASK006 with an implementation plan.
- Added initial `WorldModel` (base + edits, bedrock) and unit tests; added terrain config knobs.

## Design Link
- `memory/designs/DESIGN005-voxel-world-model-v1.md`
