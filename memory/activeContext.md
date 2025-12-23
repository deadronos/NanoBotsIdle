# Active Context

## Current focus

Implemented DESIGN006 lighting propagation, torch emission, and mob spawning with tests.

## Recently added/updated

- `src/voxel/lighting.ts`: bounded light queue + propagation helpers.
- `src/voxel/World.ts`: light arrays, sunlight updates, torch emission hooks.
- `src/voxel/meshing.ts`: vertex colors from per-block lighting.
- `src/game/GameScene.tsx`: lighting updates per frame, vertex color material.
- `src/game/ecs/gameEcs.ts`: mob spawning system + configs.
- Added lighting + mob spawn tests under `src/voxel` and `src/game/ecs`.

## Next steps

- Tune light propagation limits/thresholds and spawn parameters for gameplay feel.
- Add mob rendering/AI behaviors to visualize spawns.
- Consider optimizing lighting rebuilds (partial vertex color updates).
