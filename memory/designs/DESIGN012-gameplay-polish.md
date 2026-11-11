# Gameplay polish design

- The simulation scores a bounded set of candidate sites for dry ground, footprint slope and camera clearance. It emits the resulting player spawn and generated outpost with the seeded world. The renderer uses the worker's seed for player collision and centers initial chunk requests on the published spawn. Player-built outposts retain their persisted IDs and levels.
- The simulation records actual deposits over 60 seconds of simulation time and sums cargo after all drone transfers. The HUD reads that snapshot and uses the shop's upgrade cost and level limits. The income window is session data and resets on prestige.
- High and low voxel meshes and the render fallback share the same height palette and directional vertex shading. The shoreline uses the existing water plane.
- Worker startup imports BVX storage primitives from their pinned package paths to avoid loading unused geometry tables. The worker constructs its first world on initialization.
- See [TECH001](../../docs/ARCHITECTURE/TECH001-sim-render-separation.md) for simulation ownership, [TECH005](../../docs/ARCHITECTURE/TECH005-performance-optimizations.md) for meshing budgets, and [TASK021](../tasks/TASK021-gameplay-polish.md) for validation.
