# Progress

## What works (current)

- Vite dev/build/preview pipeline.
- Chunk streaming and pruning with bounded per-frame rebuild/sync.
- Procedural terrain generation (grass/dirt/stone, beaches, water, trees, bedrock).
- Deterministic cave carving + ore vein generation with configurable ranges.
- Face-culling meshing and incremental mesh syncing.
- Pointer-lock FPS controller with collision.
- DDA voxel picking for break/place interactions.
- Inventory + hotbar + crafting recipes.
- Runtime-generated atlas used by both voxel rendering and UI icons.
- Ore tiles added to the atlas and inventory list.
- HUD/inventory/start overlays migrated to shadcn components with Tailwind.
- Hotbar/crosshair migrated to Tailwind styling; inventory uses shadcn Tabs + ScrollArea.
- Fixed-step simulation accumulator with camera interpolation.
- Miniplex ECS PoC tracks player/time-of-day snapshots.
- ECS expanded with systems/registry for mobs/items/particles and centralized lighting state.
- Feature roadmap drafted for Minecraft-like expansion.
- Vitest tests in place (smoke + fixed-step accumulator).
- Generation tests cover determinism, order independence, and ore depth ranges.

## What’s missing / open areas

- Expanded automated tests for world math, chunk indexing, and picking edge cases.
- Persistence (save/load).
- Greedy meshing, occlusion optimizations, and more advanced lighting.

## Known constraints

- Several invariants are intentionally strict (BlockId alignment, tilesPerRow, per-frame caps). Breaking them can cause subtle rendering bugs or major perf regressions.
