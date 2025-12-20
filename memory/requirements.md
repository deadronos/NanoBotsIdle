# Requirements (current behavior)

These requirements describe **existing** behavior observed in the codebase.

1. WHEN the app boots, THE SYSTEM SHALL render the voxel world and HUD overlays.
   - Acceptance: `src/main.tsx` renders `src/ui/App.tsx` which mounts `GameCanvas` and `Hud`.

2. WHEN the player moves through the world, THE SYSTEM SHALL stream chunks within view distance and prune far chunks to keep memory bounded.
   - Acceptance: In `src/game/GameScene.tsx`, the per-frame loop calls `world.ensureChunksAround(...)` and `world.pruneFarChunks(...)` based on player position.

3. WHEN a block is changed in the world, THE SYSTEM SHALL mark the affected chunk (and neighbor chunks at boundaries) dirty so that geometry is rebuilt correctly.
   - Acceptance: World edits call `world.setBlock(...)` and `world.markDirtyAt(...)`; `World.markDirtyAt` adds neighbor keys when edits happen at edges.

4. WHEN the player breaks or places blocks, THE SYSTEM SHALL use 3D DDA picking to select the target block and enforce basic placement rules.
   - Acceptance: `pickBlockDDA(...)` is used for break/place; placement rejects solid-block overlap and player AABB overlap.

5. WHEN the player opens or closes the inventory overlay, THE SYSTEM SHALL coordinate pointer lock with UI state.
   - Acceptance: `Hud.tsx` toggles `uiOpen` via Zustand and calls `document.exitPointerLock()` when opening and `requestPointerLock?.()` when closing.
