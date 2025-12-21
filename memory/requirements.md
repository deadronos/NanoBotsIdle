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

## Planned changes (UI + fixed-step simulation)

6. WHEN HUD/inventory UIs render, THE SYSTEM SHALL use shadcn components for layout and interaction while preserving pointer-lock and hotbar behavior.
   - Acceptance: UI uses shadcn Button/Card/etc; `E` still toggles inventory and pointer lock behaves as before.

7. WHEN the simulation updates, THE SYSTEM SHALL advance world/player state on a fixed 1/60s step independent of render FPS, with a bounded catch-up loop.
   - Acceptance: movement speed is consistent at 30/60/120 FPS and the step loop clamps catch-up work.

8. WHEN rendering, THE SYSTEM SHALL interpolate between the previous and current simulation snapshots for camera placement.
   - Acceptance: camera motion remains smooth when frame time varies.

9. WHEN UI state changes, THE SYSTEM SHALL keep Zustand as the UI/state store and avoid storing heavy objects.
   - Acceptance: `World` and `THREE.*` objects remain outside Zustand even if middleware is added.

10. WHEN the inventory overlay is open, THE SYSTEM SHALL provide tabbed navigation between inventory and crafting with a scrollable content area.
    - Acceptance: inventory/crafting tabs switch content and scroll works for large lists.

11. WHEN the ECS PoC runs, THE SYSTEM SHALL track player/time-of-day snapshots inside a Miniplex world without storing heavy rendering objects.
    - Acceptance: Miniplex world stores plain data and is updated each fixed-step tick.
