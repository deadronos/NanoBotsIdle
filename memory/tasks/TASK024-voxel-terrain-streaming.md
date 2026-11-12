# Voxel terrain streaming

The first slice of issues #217 and #218 requests six surface columns beyond the local radius as the camera turns or the player crosses chunk boundaries. The visibility callback stays stable across unrelated renders. Opt-in development logs distinguish queued, in-flight, ready, empty, failed and requested chunks with no active work.

A stationary 180-degree Chrome turn triggered meshing on the opposite side. Typecheck, lint, production build and 441 tests passed. Focused tests also verified that the scheduler reports a failed chunk only after exhausting its retries.

In one six-second busy-colony run per build on Apple M4, meshed chunks increased from 79 to 105, sampled median frame time stayed at 16.67 ms, and sampled p95 moved from 21.52 to 22.44 ms. Longer runs and the repeatable seam route are still needed.

Remaining streaming work includes eviction, fog alignment and the in-game diagnostic overlay. LOD seams and terrain styling are tracked in issues #219 and #220.

## Completion

- Completed the surface ring, movement prefetch, buffered eviction, queue recovery, and fog culling. Column sampling reuses procedural heights across the job.
- Added a diagnostics overlay using the existing Settings toggle. The browser route captures screenshots and checks that both chunks rebuild after an edge edit.
- Coarse LOD preserves exact boundary occupancy. Unit coverage verifies shared-plane face coverage across high and coarse meshes at a negative chunk edge after mining.
- Added corner occlusion, per-voxel color variation, and depth-based water with a subtle shoreline highlight.
- Final validation passed typecheck, lint, the production build, 443 tests, and the Chrome route. The six-second Apple M4 busy-colony run measured 16.65 ms median and 16.67 ms p95, 81.2 average draw calls and 166 meshed chunks. Baseline values were 16.67 ms, 21.52 ms, 54.3 calls and 79 chunks. These are short samples with normal simulation variance.
