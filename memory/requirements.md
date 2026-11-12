# Requirements

## LOD, Occlusion, and Benchmarking

1. WHEN occlusion culling is enabled in configuration and WebGL2 is available, THE SYSTEM SHALL evaluate occlusion after frustum/LOD visibility and hide meshes marked occluded. [Acceptance: unit/integration tests validate occluded meshes are hidden only when previously visible.]
2. WHEN progressive LOD is enabled, THE SYSTEM SHALL apply coarse (low) LOD first for newly visible meshes and upgrade to high LOD only after the configured refine delay. [Acceptance: tests cover delayed high-LOD promotion and immediate downgrades.]
3. WHEN the benchmark scene preset is enabled, THE SYSTEM SHALL request a larger meshed-chunk neighborhood without changing default behavior. [Acceptance: tests validate configured radius values are used for chunk requests.]
4. WHEN the profiling script runs, THE SYSTEM SHALL emit FPS and draw-call metrics for the active scene in the output JSON. [Acceptance: benchmark output includes draw-call stats alongside FPS stats.]

## BVX-Kit Integration

1. WHEN a voxel is mined, THE SYSTEM SHALL record the edit in the BVX-backed edit store so material lookups return air for that coordinate. [Acceptance: unit tests verify edited coordinates report air and can be cleared.]
2. WHEN the engine needs a voxel key or coordinates, THE SYSTEM SHALL use BVX-backed key encoding/decoding that preserves negative coordinates via a stable offset. [Acceptance: unit tests round-trip coordinates through the key encoding.]
3. WHEN render/debug systems compare frontier data, THE SYSTEM SHALL use BVX-backed keys consistently across world and debug tracking. [Acceptance: integration tests for frontier targeting/updates continue to pass.]

## Gameplay polish

1. A new or prestiged world places the starter outpost on terrain and spawns the player beside it. Loading a legacy save replaces its generated outpost and preserves built outposts.
2. The HUD shows deposits over the last 60 simulation seconds, cargo value aboard drones, and the cheapest uncapped upgrade with its affordability.
3. Terrain materials and face shading match in the worker and fallback, including low LOD. The shoreline is visually distinct.
4. The production scene loads with external requests blocked. Performance verification records worker bundle size, frame time and chunk meshing on hardware WebGL.

## Mining operations

1. Players can set, move, or clear one mining zone on desktop and touch screens. The world and map show the zone, and only eligible targets inside it are assigned while it is active.
2. Outpost placement shows projected return routes and travel distance before purchase. The build menu reports current dock occupancy and queues.
3. Prestige offers a short-route landing and a higher-yield landing with longer automatic routes. The selected profile survives save and reload.
4. Mining, hauling and unloading have distinct visual feedback. A repeatable busy-colony profile measures the game with 50 drones, multiple outposts and new chunk requests.
