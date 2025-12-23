# Active Context

## Current focus

Implemented DESIGN004 ores + cave generation with deterministic passes and tests.

## Recently added/updated

- `src/voxel/World.ts`: refactored generation into heightmap, caves, ores, and features.
- `src/voxel/noise.ts`: added 3D noise helpers.
- `src/voxel/generation/rng.ts`: seeded RNG for deterministic generation.
- `src/voxel/generation.test.ts`: determinism/order/ore depth tests.
- `src/voxel/atlas.ts`: ore tiles for atlas + UI icons.

## Next steps

- Tune cave/ore generation parameters based on gameplay feedback.
- Consider workerizing chunk generation if caves/ores cause frame spikes.
- Expand world logic tests (chunk indexing, DDA edge cases).
