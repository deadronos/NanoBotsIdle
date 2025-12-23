# TASK007 - Implement DESIGN006 torches lighting and mob spawning

**Status:** Completed  
**Added:** 2025-12-23  
**Updated:** 2025-12-23

## Original Request

create a /memory/tasks implementation plan for DESIGN006 and execute that, use best practices

## Thought Process

- DESIGN006 defines a bounded lighting system (sun + block light) and a light-aware mob spawn loop.
- Integration touches voxel data (`World` + meshing), rendering (vertex colors), and ECS (spawn system).
- Invariants to preserve: `BlockId` alignment, per-frame caps, and chunk boundary rebuilds.
- Confidence Score: 88% (design is explicit; implementation fits current architecture without major refactors).

## Requirements (EARS)

1. WHEN a torch block is placed or removed, THE SYSTEM SHALL propagate block light so nearby light levels update within bounded frames.  
   **Acceptance:** Unit tests confirm expected light values around torch and at chunk borders after queue processing.
2. WHEN a block is placed or removed, THE SYSTEM SHALL update sunlight and block-light using bounded flood-fill logic so performance is predictable.  
   **Acceptance:** Light queue processes in slices and lighting changes appear after several frames; tests cover occlusion/un-occlusion.
3. WHEN low-light regions exist, THE SYSTEM SHALL spawn hostile mobs only on valid ground positions with caps and proximity rules.  
   **Acceptance:** Spawn tests ensure light threshold and caps are enforced.

## Implementation Plan

1. Add lighting storage and queue processing (sun + block) with bounded per-frame updates in `World`.
2. Extend `BlockDef` with `emitLight`, set torch emission, and add `World.getLightAt`.
3. Integrate vertex lighting into meshing and material vertex colors; mark chunks dirty on light updates.
4. Add mob spawn system with light threshold + caps; wire into ECS step.
5. Write unit tests for lighting propagation (including chunk boundaries) and spawn rules; update task log/index.

## Error Handling Matrix

| Scenario | Expected Handling | Notes |
| --- | --- | --- |
| Light queue hits missing chunk | Skip propagation and treat as opaque | Prevents crashes when chunks unload |
| Block change on chunk edge | Mark neighbor chunks dirty and re-queue light | Preserves boundary correctness |
| Spawn attempt in invalid cell | Reject and retry within budget | Keep per-tick cost bounded |

## Unit Testing Strategy

- Pure logic tests for light propagation (add/remove), sunlight column updates, and chunk border behavior.
- Spawn rule tests for `canSpawnAt` and cap enforcement with deterministic inputs.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Create task plan + index entry | Complete | 2025-12-23 | Task file drafted |
| 1.2 | Implement lighting storage + queue | Complete | 2025-12-23 | Light queue + chunk arrays wired |
| 1.3 | Mesh vertex lighting integration | Complete | 2025-12-23 | Vertex colors + material update |
| 1.4 | Mob spawn system + ECS wiring | Complete | 2025-12-23 | Spawn rules + caps + ECS integration |
| 1.5 | Tests + validation updates | Complete | 2025-12-23 | Added lighting/mob spawn tests |

## Progress Log

### 2025-12-23

- Created TASK007 with requirements, plan, and testing strategy.
- Implemented block/sun lighting storage, propagation queue, and per-vertex lighting integration.
- Added mob spawn system with light thresholds and caps.
- Added lighting and mob spawn tests; `npm test` passes.
