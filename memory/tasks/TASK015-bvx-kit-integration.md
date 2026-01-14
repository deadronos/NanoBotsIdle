# [TASK015] - BVX-Kit Voxel Integration

**Status:** Completed  
**Added:** 2026-01-13  
**Updated:** 2026-01-13

## Original Request

Install `@astrumforge/bvx-kit` and refactor voxel logic to use it.

## Thought Process

We can map the existing voxel keying and edit storage to BVX primitives without rewriting the procedural terrain system. BVX's `LinearKey` provides a compact numeric key, while `VoxelWorld` + `VoxelChunk0` can efficiently store mined (air) overrides. A stable coordinate offset preserves negative world coordinates within BVX key ranges.

## Implementation Plan

- **Red:** add tests for BVX-backed voxel key round-trips and edit storage behavior.
- **Green:** implement BVX key encoding in `shared/voxel` and introduce a `VoxelEditStore` using BVX.
- **Refactor:** update world, collision, targeting, and tests to use numeric `VoxelKey`s and the new edit store.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description                                           | Status      | Updated     | Notes |
| --- | ----------------------------------------------------- | ----------- | ----------- | ----- |
| 1.1 | Add BVX dependency and create BVX key helpers          | Complete    | 2026-01-13  | Added `LinearKey` mapping + offset helpers. |
| 1.2 | Implement BVX-backed edit store                        | Complete    | 2026-01-13  | `VoxelEditStore` with `VoxelWorld` + `VoxelChunk0`. |
| 1.3 | Refactor world/collision/frontier logic to BVX keys    | Complete    | 2026-01-13  | Updated sets, keys, and edit lookups. |
| 1.4 | Update tests for numeric keys + add BVX-specific tests | Complete    | 2026-01-13  | Updated existing tests and added key/edit store coverage. |

## Progress Log

### 2026-01-13

- Added BVX dependency and BVX-backed key/coordinate helpers.
- Introduced `VoxelEditStore` and migrated world/collision edit logic.
- Updated frontier tracking to use numeric BVX keys and revised related tests.
