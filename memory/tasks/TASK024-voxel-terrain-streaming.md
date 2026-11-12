# Voxel terrain streaming

The first slice of issues #217 and #218 requests six surface columns beyond the local radius as the camera turns or the player crosses chunk boundaries. The visibility callback stays stable across unrelated renders. Opt-in development logs distinguish queued, in-flight, ready, empty, failed and requested chunks with no active work.

A stationary 180-degree Chrome turn triggered meshing on the opposite side. Typecheck, lint, production build and 441 tests passed. Focused tests also verified that the scheduler reports a failed chunk only after exhausting its retries.

In one six-second busy-colony run per build on Apple M4, meshed chunks increased from 79 to 105, sampled median frame time stayed at 16.67 ms, and sampled p95 moved from 21.52 to 22.44 ms. Longer runs and the repeatable seam route are still needed.

Remaining streaming work includes eviction, fog alignment and the in-game diagnostic overlay. LOD seams and terrain styling are tracked in issues #219 and #220.
