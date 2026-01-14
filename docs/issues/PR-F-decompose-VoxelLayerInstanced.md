# PR F — Decompose `VoxelLayerInstanced` into hooks

**Goal:** Split `VoxelLayerInstanced` responsibilities into focused hooks: `usePlayerChunkTracker`, `useLODManager`, and `useFrontierHandler` to simplify the component and improve testability.

**Acceptance criteria:**
- New hooks added under `src/components/world/hooks/` with unit tests where possible.
- `VoxelLayerInstanced.tsx` reduced in size and composes the new hooks.
- Integration tests or smoke tests ensure behavior is unchanged (frontier, LOD switching, edits handling).

**Labels:** `area/world`, `size/L`
