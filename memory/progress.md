# Progress

## What works (current)

- Vite dev/build/preview pipeline.
- Chunk streaming and pruning with bounded per-frame rebuild/sync.
- Procedural terrain generation (grass/dirt/stone, beaches, water, trees, bedrock).
- Face-culling meshing and incremental mesh syncing.
- Pointer-lock FPS controller with collision.
- DDA voxel picking for break/place interactions.
- Inventory + hotbar + crafting recipes.
- Runtime-generated atlas used by both voxel rendering and UI icons.

## What’s missing / open areas

- Automated tests (no test runner configured yet).
- Persistence (save/load).
- Greedy meshing, occlusion optimizations, and more advanced lighting.

## Known constraints

- Several invariants are intentionally strict (BlockId alignment, tilesPerRow, per-frame caps). Breaking them can cause subtle rendering bugs or major perf regressions.
