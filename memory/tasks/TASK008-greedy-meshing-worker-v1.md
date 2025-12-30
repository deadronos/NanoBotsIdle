# [TASK008] Greedy Meshing Worker v1 (Chunk Surface Geometry)

**Status:** Pending  
**Added:** 2025-12-30  
**Updated:** 2025-12-30

## Original Request

Create a very detailed implementation plan (50+ small steps) using a TDD flow
similar to:

- TDD Red: write failing tests first
- TDD Green: minimal implementation to make tests pass
- TDD Refactor: improve design/quality while keeping tests green

Goal feature: implement the meshing worker pipeline described in DESIGN007 and
prioritized by TECH003/DEC005.

## References (source of truth)

Architecture:

- `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- `docs/ARCHITECTURE/TECH002-voxel-world-model.md`
- `docs/ARCHITECTURE/TECH003-voxel-chunk-representation-and-render-adapters.md`
- `docs/ARCHITECTURE/DEC003-procedural-base-plus-edits.md`
- `docs/ARCHITECTURE/DEC004-render-visibility-driven-and-chunk-caches.md`
- `docs/ARCHITECTURE/DEC005-greedy-meshing-for-block-voxel-surfaces.md`

Design:

- `memory/designs/DESIGN007-greedy-meshing-worker-v1.md`

## Requirements (EARS)

- WHEN the renderer is configured for meshed voxels, THE SYSTEM SHALL render
  chunk surface geometry derived from exposed faces only (no interior voxel
  geometry).
- WHEN a voxel edit occurs, THE SYSTEM SHALL schedule remeshing for the owning
  chunk (and boundary neighbor chunks as needed) [Acceptance: dirty chunk list
  includes expected chunk ids].
- WHEN the meshing worker returns out-of-order results, THE SYSTEM SHALL ignore
  stale results using a per-chunk revision check.
- WHEN a chunk has no exposed faces, THE SYSTEM SHALL remove/hide that chunk’s
  mesh geometry.
- WHEN meshing runs, THE SYSTEM SHALL keep meshing code pure (no Three/DOM
  imports) and exchange geometry via typed arrays and transferables.

## Scope

### In scope (v1)

- Add a new voxel render mode (e.g., `"meshed"`) behind config.
- Track dirty chunks and schedule meshing jobs.
- Build `(size+2)^3` apron material buffers for a chunk.
- Implement greedy meshing for block voxels.
- Implement a meshing worker (single worker v1).
- Main-thread adapter applies worker results to `BufferGeometry`.
- Stale-result prevention via chunk revisions.

### Out of scope (v1)

- Worker pool; multi-thread meshing.
- Lighting, AO, fluids, caves.
- Cross-chunk greedy merging.
- Save/load.

## TDD working agreement

Follow this strict loop for each small behavior:

1. **RED**
   - Write one small, focused test for the next behavior.
   - Run the narrowest test command that proves it fails for the right reason.
2. **GREEN**
   - Implement the minimum code to make that single test pass.
   - Re-run the same narrow test command.
3. **REFACTOR**
   - Improve naming, structure, and remove duplication.
   - Run the same test again.

Rules:

- Do not write production code without a failing test.
- Do not write multiple tests at once.
- Prefer pure helper modules for meshing logic (easy to unit test).

## Testing strategy

- Prefer unit tests for pure meshing helpers (mask generation, rectangle merge,
  index/winding correctness).
- Prefer integration tests for:
  - dirty-chunk routing and boundary dirtying
  - worker protocol message shapes
  - stale result rejection

Suggested commands:

- Targeted: `npm test -- <pattern>`
- Full: `npm test`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`

## Implementation Plan

### Milestone A: Prep + config flagging

- Introduce a new render mode for meshed voxels.
- Ensure existing modes remain intact.

### Milestone B: Chunk addressing + dirty routing

- Define chunk id representation for dirty lists.
- Implement “edit → dirty chunk(s)” logic.

### Milestone C: Apron material buffer builder

- Create a pure helper that fills `(size+2)^3` materials for a chunk.
- Ensure indexing rules are correct.

### Milestone D: Greedy meshing core

- Build the minimal greedy meshing algorithm for block voxel faces.
- Ensure deterministic output and correct winding.

### Milestone E: Meshing worker protocol + transport

- Implement worker message types and a worker script.
- Transfer geometry buffers back to main thread.

### Milestone F: Main-thread mesh adapter

- Maintain per-chunk geometry + revision.
- Apply mesh results to Three geometries.
- Hide/remove empty meshes.

### Milestone G: Hardening + performance

- Coalesce dirty chunks.
- Prevent stale results.
- Avoid unnecessary allocations.

## Progress Tracking

**Overall Status:** Not Started — 0%

### Subtasks

|ID|Task|Phase|Status|Updated|Notes|
|---|---|---|---|---|---|
|1|Confirm acceptance criteria + non-goals|Prep|Not Started|2025-12-30|Align with DESIGN007/DEC005|
|2|Run `npm test` baseline|Prep|Not Started|2025-12-30|Record failures if any|
|3|Run `npm run typecheck` baseline|Prep|Not Started|2025-12-30||
|4|Run `npm run lint` baseline|Prep|Not Started|2025-12-30||
|5|Identify current voxel render mode switch points|Prep|Not Started|2025-12-30|World render adapter selection|
|6|Decide render config value name (`meshed`)|Prep|Not Started|2025-12-30|Prefer `render.voxels.mode` union|
|7|RED: test config default remains stable for existing modes|Red|Not Started|2025-12-30|Avoid regressions|
|8|GREEN: add `meshed` to config types (minimal)|Green|Not Started|2025-12-30|No behavior change|
|9|REFACTOR: document render modes in config docs/tests|Refactor|Not Started|2025-12-30|Keep consistent|
|10|RED: test dirty-chunk calculation for interior edit|Red|Not Started|2025-12-30|Own chunk only|
|11|GREEN: implement `getDirtyChunksForEdit()` helper|Green|Not Started|2025-12-30|Pure helper|
|12|REFACTOR: extract shared chunk math helpers|Refactor|Not Started|2025-12-30|Avoid duplication|
|13|RED: test boundary edit dirties neighbor chunks (x-)|Red|Not Started|2025-12-30|Chunk edge|
|14|GREEN: implement x-boundary neighbor dirtying|Green|Not Started|2025-12-30|Minimal|
|15|RED: test boundary edit dirties neighbor chunks (x+)|Red|Not Started|2025-12-30|Chunk edge|
|16|GREEN: implement x+ dirtying|Green|Not Started|2025-12-30|Minimal|
|17|RED: test boundary edit dirties neighbor chunks (y-/y+)|Red|Not Started|2025-12-30|Chunk edge|
|18|GREEN: implement y-boundary dirtying|Green|Not Started|2025-12-30|Minimal|
|19|RED: test boundary edit dirties neighbor chunks (z-/z+)|Red|Not Started|2025-12-30|Chunk edge|
|20|GREEN: implement z-boundary dirtying|Green|Not Started|2025-12-30|Minimal|
|21|REFACTOR: ensure dirty results are unique and ordered deterministically|Refactor|Not Started|2025-12-30|Set → stable output|
|22|RED: test apron buffer dimensions and indexing|Red|Not Started|2025-12-30|18^3 for size=16|
|23|GREEN: implement `createApronField()` allocating `Uint8Array`|Green|Not Started|2025-12-30|Pure helper|
|24|RED: test mapping from (lx,ly,lz) to linear index|Red|Not Started|2025-12-30|Index math|
|25|GREEN: implement `index3D()` helper|Green|Not Started|2025-12-30|Pure|
|26|REFACTOR: add bounds checks in dev mode (optional)|Refactor|Not Started|2025-12-30|Keep fast path|
|27|RED: test apron samples include neighbors outside chunk|Red|Not Started|2025-12-30|Chunk boundary correctness|
|28|GREEN: fill apron field using `materialAt` queries|Green|Not Started|2025-12-30|Minimal correctness|
|29|REFACTOR: pass world/context explicitly to avoid repeated config reads|Refactor|Not Started|2025-12-30|Perf hygiene|
|30|RED: test face visibility rule emits a single quad for a single solid voxel|Red|Not Started|2025-12-30|Synthetic small field|
|31|GREEN: implement naive face emission (no merging yet)|Green|Not Started|2025-12-30|Get to green quickly|
|32|REFACTOR: centralize face definitions + winding tables|Refactor|Not Started|2025-12-30|Readable|
|33|RED: test no faces emitted for all-air field|Red|Not Started|2025-12-30|Empty mesh|
|34|GREEN: return empty geometry buffers on empty|Green|Not Started|2025-12-30|Indices length 0|
|35|REFACTOR: define mesh result shape for empty chunks|Refactor|Not Started|2025-12-30|Consistent|
|36|RED: test merging reduces quad count for a 2x1 surface|Red|Not Started|2025-12-30|First greedy win|
|37|GREEN: implement greedy merging on one axis/slice|Green|Not Started|2025-12-30|Minimal axis|
|38|REFACTOR: extract mask build + rectangle merge helpers|Refactor|Not Started|2025-12-30|Pure helpers|
|39|RED: test greedy merging on all axes (basic scenarios)|Red|Not Started|2025-12-30|Coverage|
|40|GREEN: complete greedy merge across all directions|Green|Not Started|2025-12-30|Correctness|
|41|REFACTOR: ensure deterministic face ordering|Refactor|Not Started|2025-12-30|Stable output|
|42|RED: test triangle winding produces outward normals (one face)|Red|Not Started|2025-12-30|Backface correctness|
|43|GREEN: fix winding table|Green|Not Started|2025-12-30|Minimal|
|44|REFACTOR: add small helper assertions for winding in tests|Refactor|Not Started|2025-12-30|Readable|
|45|RED: test index buffer type selection (`Uint16` vs `Uint32`)|Red|Not Started|2025-12-30|Large mesh case|
|46|GREEN: implement safe selection logic|Green|Not Started|2025-12-30|Minimal|
|47|REFACTOR: keep geometry builder allocation-light|Refactor|Not Started|2025-12-30|Avoid churn|
|48|RED: test meshing worker message roundtrip shape|Red|Not Started|2025-12-30|Protocol test|
|49|GREEN: create meshing worker entry and handler (no transfer yet)|Green|Not Started|2025-12-30|Minimal|
|50|REFACTOR: isolate worker protocol types into shared module|Refactor|Not Started|2025-12-30|No Three|
|51|RED: test transferables are used (where testable) or at least buffers exist|Red|Not Started|2025-12-30|Pragmatic|
|52|GREEN: postMessage with transfer list|Green|Not Started|2025-12-30|Perf|
|53|REFACTOR: add buffer pooling hooks (optional)|Refactor|Not Started|2025-12-30|Later opt|
|54|RED: test main-thread meshing scheduler coalesces dirty chunks|Red|Not Started|2025-12-30|No duplicate jobs|
|55|GREEN: implement dirty set + in-flight tracking|Green|Not Started|2025-12-30|Minimal|
|56|REFACTOR: isolate scheduler as a pure-ish class|Refactor|Not Started|2025-12-30|Testable|
|57|RED: test stale result rejection via chunk revision|Red|Not Started|2025-12-30|Out-of-order safe|
|58|GREEN: implement revision check|Green|Not Started|2025-12-30|Drop stale|
|59|REFACTOR: document the revision contract|Refactor|Not Started|2025-12-30|Maintainable|
|60|RED: test applying mesh result creates/updates chunk geometry handle|Red|Not Started|2025-12-30|Adapter behavior|
|61|GREEN: implement minimal mesh adapter apply/update|Green|Not Started|2025-12-30|No fancy reuse|
|62|REFACTOR: ensure GPU resources disposed on replace|Refactor|Not Started|2025-12-30|No leaks|
|63|RED: test empty mesh result hides/removes chunk mesh|Red|Not Started|2025-12-30|No exposed faces|
|64|GREEN: implement hide/remove behavior|Green|Not Started|2025-12-30|Minimal|
|65|REFACTOR: keep chunk mesh map clean on unload|Refactor|Not Started|2025-12-30|Bounded memory|
|66|RED: test render mode switch uses meshed adapter path|Red|Not Started|2025-12-30|World integration|
|67|GREEN: wire World component to meshing scheduler/adapter|Green|Not Started|2025-12-30|Feature-flagged|
|68|REFACTOR: keep frontier mode intact; minimize branching|Refactor|Not Started|2025-12-30|Clean|
|69|RED: test edit→dirtyChunks integration path triggers remesh|Red|Not Started|2025-12-30|End-to-end|
|70|GREEN: connect engine delta edits to dirty scheduling|Green|Not Started|2025-12-30|Minimal|
|71|REFACTOR: avoid per-frame allocations in hot path|Refactor|Not Started|2025-12-30|Perf hygiene|
|72|Run full test suite|Validate|Not Started|2025-12-30|`npm test`|
|73|Run `npm run typecheck`|Validate|Not Started|2025-12-30||
|74|Run `npm run lint`|Validate|Not Started|2025-12-30||
|75|Manual smoke: toggle frontier vs meshed modes|Validate|Not Started|2025-12-30|Visual sanity|
|76|Manual smoke: mining updates meshed chunk geometry|Validate|Not Started|2025-12-30|Dirty remesh works|
|77|Perf check: confirm main thread stays responsive during remesh|Validate|Not Started|2025-12-30|No jank|
|78|Docs: ensure TECH003/DEC005/DESIGN007 stay accurate|Handoff|Not Started|2025-12-30|Update if drift|
|79|Update tasks index; mark In Progress when starting|Handoff|Not Started|2025-12-30|Keep resumable|
|80|Archive task/design on completion|Handoff|Not Started|2025-12-30|Move to COMPLETED|

## Progress Log

### 2025-12-30

- Created TASK008 with a TDD-structured implementation plan aligned to DESIGN007,
  TECH003, and DEC005.
