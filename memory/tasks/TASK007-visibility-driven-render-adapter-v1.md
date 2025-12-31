# [TASK007] Visibility-Driven Render Adapter v1 (Frontier Instancing)

**Status:** Completed  
**Added:** 2025-12-30  
**Updated:** 2025-12-30

## Original Request

Create a very detailed implementation plan (50+ small steps) using a TDD flow
similar to:

- TDD Red: write failing tests first
- TDD Green: minimal implementation to make tests pass
- TDD Refactor: improve design/quality while keeping tests green

Goal feature: align the codebase with DEC004/TECH003 by making default voxel
rendering visibility-driven (frontier instancing), removing reliance on chunk
volume scans for render population.

## References (source of truth)

Architecture:

- `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- `docs/ARCHITECTURE/TECH002-voxel-world-model.md`
- `docs/ARCHITECTURE/TECH003-voxel-chunk-representation-and-render-adapters.md`
- `docs/ARCHITECTURE/DEC003-procedural-base-plus-edits.md`
- `docs/ARCHITECTURE/DEC004-render-visibility-driven-and-chunk-caches.md`

Design:

- `memory/designs/COMPLETED/DESIGN006-visibility-driven-render-adapter-v1.md`

## Scope

### In scope

- Engine emits frontier reset + initial frontier snapshot + per-edit frontier
  deltas.
- Main thread consumes frontier deltas and updates instanced geometry without
  scanning chunk volumes.
- Keep the existing “dense chunk instancing” path as a debug fallback behind a
  flag (optional).

### Out of scope

- Greedy meshing/surface nets.
- Dense paletted/bitpacked chunk storage.
- Save/load serialization.

## TDD working agreement (how to execute this task)

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
   - When a milestone completes, run the broader suite.

Suggested commands:

- Targeted: `npm test -- <pattern>`
- Full: `npm test`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`

Rules:

- Do not write production code without a failing test.
- Do not write multiple tests at once.
- Keep steps small; prefer pure functions for logic that needs tests.

## Implementation Plan

### Milestone A: Baseline + safety rails

- Establish baseline performance and behavior.
- Add feature flag(s) so we can switch adapters without destabilizing gameplay.

### Milestone B: Engine outputs a visibility set (frontier)

- On init/reset: send `frontierReset` + initial `frontierAdd` snapshot.
- On mining: send `edits` + `frontierAdd` + `frontierRemove` deltas.

### Milestone C: Main-thread frontier adapter (instanced)

- Maintain `indexByKey` and swap-with-last removal.
- Apply delta updates without scanning chunk volumes.

### Milestone D: Remove dense chunk scanning as default

- Default to frontier-driven rendering.
- Keep dense chunk scan path only for debug.

### Milestone E: Hardening

- Typed array payloads, buffer reuse, avoid per-frame allocations.
- Update docs/tests for long-term maintainability.

## Progress Tracking

**Overall Status:** Completed — 100%

### Subtasks

|ID|Task|Phase|Status|Updated|Notes|
|---|---|---|---|---|---|
|1|Confirm acceptance criteria + non-goals|Prep|Not Started|2025-12-30|Align to DESIGN006/DEC004|
|2|Run `npm test` baseline|Prep|Not Started|2025-12-30|Record failures if any|
|3|Run `npm run typecheck` baseline|Prep|Not Started|2025-12-30||
|4|Run `npm run lint` baseline|Prep|Not Started|2025-12-30||
|5|Identify current dense-scan render path entrypoints|Prep|Not Started|2025-12-30|Likely World component + chunk helpers|
|6|Decide feature flag location and naming|Prep|Not Started|2025-12-30|Config-driven preferred|
|7|RED: test config flag defaults for new adapter|Red|Not Started|2025-12-30|Add/update config tests|
|8|GREEN: implement config flag plumbing|Green|Not Started|2025-12-30|Minimal change|
|9|REFACTOR: consolidate config constants/docs|Refactor|Not Started|2025-12-30|Keep existing patterns|
|10|RED: test engine emits `frontierReset` on init|Red|Not Started|2025-12-30|Protocol-level test|
|11|GREEN: implement `frontierReset` emission|Green|Not Started|2025-12-30|Minimal delta|
|12|REFACTOR: name/structure engine init output|Refactor|Not Started|2025-12-30|Avoid duplication|
|13|RED: test engine emits initial frontier snapshot (`frontierAdd`)|Red|Not Started|2025-12-30|Snapshot existence/shape|
|14|GREEN: implement initial frontier snapshot packing|Green|Not Started|2025-12-30|Use Float32Array|
|15|REFACTOR: extract frontier packing helper|Refactor|Not Started|2025-12-30|Pure helper, testable|
|16|RED: test mining returns `edits` + frontier deltas (add/remove)|Red|Not Started|2025-12-30|Deterministic scenario|
|17|GREEN: emit frontier deltas in engine tick output|Green|Not Started|2025-12-30|Minimal wiring|
|18|REFACTOR: standardize “delta aggregation” code|Refactor|Not Started|2025-12-30|Reduce allocations|
|19|RED: test that delta sizes are bounded (≤ 7 voxels per mine)|Red|Not Started|2025-12-30|Architectural contract|
|20|GREEN: enforce/verify bounded update behavior|Green|Not Started|2025-12-30|Might be implicit|
|21|REFACTOR: document the bounded-delta invariant|Refactor|Not Started|2025-12-30|In code + doc link|
|22|RED: test “frontier adapter store” add semantics (no dupes)|Red|Not Started|2025-12-30|Pure unit test|
|23|GREEN: implement minimal frontier adapter store|Green|Not Started|2025-12-30|Map + positions|
|24|RED: test remove semantics (swap-with-last)|Red|Not Started|2025-12-30|Maintain bijection|
|25|GREEN: implement swap-with-last removal|Green|Not Started|2025-12-30|Minimal|
|26|REFACTOR: extract keying helper + invariants|Refactor|Not Started|2025-12-30|Prep for packed keys|
|27|RED: test adapter can apply `frontierReset`|Red|Not Started|2025-12-30|Clears state|
|28|GREEN: implement reset handling|Green|Not Started|2025-12-30||
|29|REFACTOR: ensure zero allocations on reset hot path|Refactor|Not Started|2025-12-30|Best-effort|
|30|RED: test World component consumes `frontierAdd` and shows voxels|Red|Not Started|2025-12-30|Integration-level, logic focused|
|31|GREEN: wire `frontierAdd` to instanced updates|Green|Not Started|2025-12-30|Feature-flagged|
|32|RED: test World consumes `frontierRemove` and hides voxels|Red|Not Started|2025-12-30|Integration-level|
|33|GREEN: wire `frontierRemove` to instanced updates|Green|Not Started|2025-12-30|Feature-flagged|
|34|REFACTOR: isolate adapter interface from World component|Refactor|Not Started|2025-12-30|Keep World simple|
|35|RED: test that chunk volume scan is not called in frontier mode|Red|Not Started|2025-12-30|Spy/stub approach|
|36|GREEN: bypass dense scan path in frontier mode|Green|Not Started|2025-12-30|Default behavior|
|37|REFACTOR: keep dense scan behind debug flag|Refactor|Not Started|2025-12-30|Useful for troubleshooting|
|38|RED: test collision proxy still applies edits correctly|Red|Not Started|2025-12-30|Regression guard|
|39|GREEN: adjust plumbing if needed (no behavior change)|Green|Not Started|2025-12-30|Keep minimal|
|40|REFACTOR: unify seed/config invariants usage in hot loops|Refactor|Not Started|2025-12-30|Avoid repeated config reads|
|41|RED: test initial world shows plausible frontier count|Red|Not Started|2025-12-30|Deterministic seed|
|42|GREEN: tune init snapshot source (engine frontier set)|Green|Not Started|2025-12-30|Use existing frontierPositions|
|43|REFACTOR: prefer typed arrays end-to-end|Refactor|Not Started|2025-12-30|Minimize object arrays|
|44|RED: test buffer reuse/pooling contract (optional)|Red|Not Started|2025-12-30|If implemented|
|45|GREEN: implement minimal buffer reuse|Green|Not Started|2025-12-30|Keep simple|
|46|REFACTOR: remove intermediate allocations in delta aggregation|Refactor|Not Started|2025-12-30|Use push into number[] then pack|
|47|RED: test `frontierReset` on prestige resets renderer state|Red|Not Started|2025-12-30|Integration|
|48|GREEN: ensure reset path clears adapter and re-seeds frontier|Green|Not Started|2025-12-30||
|49|REFACTOR: centralize reset handling between systems|Refactor|Not Started|2025-12-30|Avoid divergence|
|50|Run full test suite after frontier adapter integration|Validate|Not Started|2025-12-30|`npm test`|
|51|Run `npm run typecheck` after integration|Validate|Not Started|2025-12-30||
|52|Run `npm run lint` after integration|Validate|Not Started|2025-12-30||
|53|Manual smoke test: mine voxel updates visuals|Validate|Not Started|2025-12-30|No chunk-population scan|
|54|Manual smoke test: drones still mine frontier correctly|Validate|Not Started|2025-12-30|Above-water constraint|
|55|Manual smoke test: player collision matches edits|Validate|Not Started|2025-12-30|Main-thread proxy|
|56|Measure perf: confirm delta cost scales with edits, not volume|Validate|Not Started|2025-12-30|Basic FPS observation|
|57|Docs: ensure TECH003/DEC004/DESIGN006 references remain accurate|Handoff|Not Started|2025-12-30|Update if drift|
|58|Update tasks index + mark status In Progress when starting|Handoff|Not Started|2025-12-30|`memory/tasks/_index.md`|
|59|Post-merge cleanup: consider archiving debug dense-scan mode|Handoff|Not Started|2025-12-30|Optional|
|60|Archive design/task when complete|Handoff|Not Started|2025-12-30|Move to COMPLETED folders|

## Progress Log

### 2025-12-30

- Created TASK007 with a TDD-structured implementation plan aligned to DESIGN006,
  TECH003, and DEC004.
- Implemented frontier-driven voxel rendering as the default path:
  - Added `cfg.render.voxels.mode` (default: `frontier`) with `dense` as a debug fallback.
  - Updated `src/components/World.tsx` to consume `frontierAdd/frontierRemove/frontierReset` and stop populating voxels via chunk volume scans by default.
  - Added tests for frontier delta invariants and the swap-with-last voxel instance store.
  - Validation: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
