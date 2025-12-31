# Plan: Add LOD and Culling for Chunk Meshes

Goal: Introduce distance-based LOD and frustum culling (with optional occlusion) for chunk meshes to reduce draw calls and improve FPS.

## Phases (4)

1. **Phase 1: Distance LOD selection and explicit frustum visibility**
   - **Objective:** Add distance-based LOD selection and explicit frustum checks to skip rendering distant or off-screen chunk meshes without changing the worker output.
   - **Files/Functions to Modify/Create:** components/World.tsx (visibility and LOD selection), new helpers render/frustumUtils.ts and render/lodUtils.ts, tests/lod-selection.test.ts, tests/frustum.test.ts, tests/meshed-visibility.integration.test.ts.
   - **Tests to Write:** lod selection pure function tests; frustum helper tests; integration test ensuring off-screen or far chunks are hidden or downgraded.
   - **Steps:**
     1. Add pure helpers for LOD choice and frustum checks (reuse cached Frustum and temp vectors).
     2. Wire camera access (useThree) and apply visibility/LOD to chunk meshes in the render layer.
     3. Add integration test for visibility/LOD behavior with deterministic camera/chunk setup.
     4. Run test, lint, typecheck.

2. **Phase 2: Worker-side multi-LOD generation and switching**
   - **Objective:** Extend meshing worker to emit multiple LOD geometries and swap them on the main thread based on distance.
   - **Files/Functions to Modify/Create:** src/worker/meshing/greedyMesher.ts or new meshing/lodMesher.ts, worker protocol types, src/meshingScheduler.ts (apply MESH_RESULT with LODs), components/World.tsx (geometry swap), tests/greedy-mesher.lod.test.ts, tests/meshing-worker.lod.test.ts, tests/meshed-lod.integration.test.ts.
   - **Tests to Write:** LOD mesher output correctness; worker-to-main LOD delivery; integration swap behavior.
   - **Steps:**
     1. Add optional LOD generation (downsampled voxel grid + greedy mesher) in worker and extend message schema to carry multiple LOD buffers.
     2. Update scheduler/apply path to store and swap geometries; dispose unused LODs.
     3. Add integration tests covering multiple LOD payloads and distance-based swaps.
     4. Run test, lint, typecheck.

3. **Phase 3: Optional occlusion culling prototype**
   - **Objective:** Prototype an optional occlusion culling path (WebGL2 queries or software heuristic) with feature detection and fallback.
   - **Files/Functions to Modify/Create:** new render/occlusionCuller.ts, components/World.tsx integration hook, renderer wiring to obtain gl context; tests/occlusion.unit.test.ts, tests/occlusion.integration.test.ts, tests/perf/occlusion.smoke.test.ts.
   - **Tests to Write:** Query lifecycle and state machine (mocked); integration with mocked occlusion results; perf smoke on draw-call reduction (mock or headless context).
   - **Steps:**
     1. Add feature-detected occlusion culler with pooled queries and multi-frame result handling; fall back to no-occlusion when unsupported.
     2. Integrate with chunk visibility pipeline; gate by config flag.
     3. Add tests and perf smoke; ensure deterministic mocks for CI.
     4. Run test, lint, typecheck.

4. **Phase 4: Polish, docs, and perf CI**
   - **Objective:** Stabilize LOD/visibility, add metrics, docs, and perf smoke in CI.
   - **Files/Functions to Modify/Create:** docs/ARCHITECTURE/DEC-LOD-CULLING.md (or similar), config entries for LOD thresholds and toggles, telemetry hooks in components/World.tsx or a small metrics helper, CI workflow step for perf smoke.
   - **Tests to Write:** Perf smoke baselines (draw-call or mesh-visible counts) and thresholds; any refined integration tests after tuning.
   - **Steps:**
     1. Document LOD/culling configuration and operational guidance.
     2. Add optional telemetry (dev-only) for visible chunks, LOD distribution, and culling stats.
     3. Add CI perf smoke job and thresholds; update docs/memory bank with outcomes.
     4. Run test, lint, typecheck.

## Open Questions

1. LOD generation method: Use worker-side voxel downsample + greedy mesher (recommended).
2. Occlusion approach: WebGL2 occlusion queries with feature detection and fallback; skip if unsupported in CI.
3. Performance budget targets: To be set when tuning (e.g., reduce visible mesh count or draw calls by X% at radius R).
