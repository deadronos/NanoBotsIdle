# DESIGN011 - BVX-Kit Voxel Integration

## Overview

Refactor voxel keying and edit storage to use `@astrumforge/bvx-kit` while preserving existing gameplay behavior (mining, frontier tracking, collision). BVX is used for key encoding (`LinearKey`) and for edit storage (`VoxelWorld` + `VoxelChunk0`), keeping the existing procedural base terrain logic intact.

## Architecture

- **Keying Layer:** `src/shared/voxel.ts`
  - Uses BVX `LinearKey` for encoding voxel coordinates into a compact numeric `VoxelKey`.
  - Applies a stable coordinate offset to support negative world coordinates.
  - Exposes `voxelKey`, `coordsFromVoxelKey`, and `toWorldIndex`.
- **Edit Storage:** `src/shared/voxelEdits.ts`
  - Uses BVX `VoxelWorld` to store mined voxels as bit voxels.
  - `VoxelChunk0` keeps the memory footprint minimal (no metadata layer).
- **World & Collision**
  - `WorldModel` and `sim/collision` query the BVX-backed edit store to override procedural terrain with “air” for mined voxels.
  - Frontier sets now store `VoxelKey` numbers instead of string keys.

## Data Flow

```mermaid
flowchart LR
    Input[Mining Event] --> WorldModel
    WorldModel -->|setMaterial air| EditStore[VoxelEditStore (BVX)]
    WorldModel --> Frontier[Frontier Sets (VoxelKey)]
    Collision -->|hasAirEdit| EditStore
    RenderDebug -->|coordsFromVoxelKey| Frontier
```

## Interfaces

### `src/shared/voxel.ts`

- `type VoxelKey = number`
- `voxelKey(x, y, z): VoxelKey`
- `coordsFromVoxelKey(key): { x: number; y: number; z: number }`
- `toWorldIndex(x, y, z, optres?): WorldIndex`

### `src/shared/voxelEdits.ts`

- `VoxelEditStore`
  - `clear()`: Reset BVX world
  - `hasAirEdit(x, y, z): boolean`
  - `setMaterial(x, y, z, material: number): void`

## Error Matrix

| Scenario | Expected Behavior | Handling |
| --- | --- | --- |
| Coordinate outside BVX key range | Avoid silent wrap/overflow | Documented via offset + test coverage; rely on terrain radius to remain within bounds. |
| Missing BVX chunk for read | Treat as no edit | `hasAirEdit` returns false when chunk missing. |
| Clearing a non-existent edit | No-op | `setMaterial` ignores unset when chunk missing. |

## Unit Testing Strategy

- **Voxel key round-trip:** `voxelKey` + `coordsFromVoxelKey` should preserve coordinates.
- **Edit store behavior:** `VoxelEditStore` should register air edits and clear them when non-air material is applied.
- **Regression tests:** existing targeting and drone mining tests should continue to pass with numeric keys.

## Implementation Notes

- Use BVX `LinearKey` and `WorldIndex` with a coordinate offset to support negative coordinates.
- Store only mined/air overrides in BVX; procedural base material remains authoritative for solids/bedrock.
- Update `KeyIndex` and frontier tracking to use `VoxelKey`.

## Open Questions / Follow-ups

- If terrain bounds expand beyond ±512, revisit key range or apply chunk-windowing logic.
