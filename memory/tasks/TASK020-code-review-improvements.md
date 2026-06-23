# [TASK020] - Code review follow-ups: dead code, hot-path cleanups, and CI hardening

**Status:** Complete
**Added:** 2026-06-23
**Updated:** 2026-06-23
**Branch:** `fix/code-review-improvements-2026-06-23`

## Original Request

Apply the five enhancements/fixes recommended in the post-merge code review of
`TASK019` (dependency upgrade), plus the smaller bonus items. Open a PR when
the repo is green.

## Thought Process

- The review surfaced real tech debt (dead `upgrades` field + dev-stream
  commentary in `createSimBridge.ts`), a per-frame hot-path cost in `App.tsx`,
  an unsafe cast + per-instance material in the Outposts beacon, a hidden
  module-level persistence flag, and a missing CI guard for production-dep CVEs.
- Each fix has a contained blast radius and concrete validation hooks.
- The dead `upgrades: Record<string, number>` field was the highest-leverage
  cleanup: it removed stream-of-consciousness comments that conflated several
  investigations and resolved a real ambiguity in the worker INIT payload.

## Implementation Plan

- Remove dead `upgrades` field across protocol, schema, ui store, engine,
  bridge, and tests; clean up dev commentary in `createSimBridge.ts`.
- Extract a `simFramePersist` helper that builds a per-field diff of the
  persistent store vs. the latest sim frame, and wire `App.tsx` to use it.
- Share a single `MeshBasicMaterial` across all outpost beacons and pulse it
  once per frame from the parent component.
- Replace module-level `setAllowPersist` with `pausePersist`/`resumePersist`
  helpers and update callers (`saveUtils.ts`) and tests.
- Add an `audit:prod` npm script and wire it into the CI workflow alongside
  `typecheck` and `lint`.
- Tighten the `useDroneMeshInit` re-init key to be a `string | null` derived
  from both geometry and material UUIDs.
- Filter jsdom's `Not implemented: navigation` warnings by patching
  `process.stderr.write` in the test setup file.
- Add unit tests for the new helpers and persistence API.

## Progress Tracking

**Overall Status:** Complete - 100%

### Subtasks

| ID  | Description                              | Status   | Updated    | Notes                                       |
| --- | ---------------------------------------- | -------- | ---------- | ------------------------------------------- |
| 1.1 | Remove dead `upgrades` field + comments  | Complete | 2026-06-23 | protocol/schema/ui/engine/bridge + tests    |
| 1.2 | `simFramePersist` helper + App.tsx diff  | Complete | 2026-06-23 | Skips redundant writes per sim frame        |
| 1.3 | Shared outpost beacon material           | Complete | 2026-06-23 | Single `MeshBasicMaterial`, parent pulse    |
| 1.4 | `pausePersist`/`resumePersist` API       | Complete | 2026-06-23 | `saveUtils.resetGame` updated; tests updated |
| 1.5 | `npm audit:prod` + CI integration        | Complete | 2026-06-23 | Fails on high-severity prod CVE             |
| 1.6 | Drone mesh init key tightening           | Complete | 2026-06-23 | `string \| null` contract                   |
| 1.7 | Filter jsdom navigation warnings         | Complete | 2026-06-23 | Patch `process.stderr.write` in setup file  |
| 1.8 | Unit tests for new helpers + API         | Complete | 2026-06-23 | +17 tests; total 415 passing                |

## Progress Log

### 2026-06-23

- Created branch `fix/code-review-improvements-2026-06-23`.
- Investigated the `upgrades: Record<string, number>` field: confirmed it
  was dead across the worker protocol, schema, ui store, and bridge init
  payload. Removed it everywhere (5 source files + 8 tests) and replaced
  the dev-stream comments in `createSimBridge.ts` with concise documentation.
- Extracted `outpostsUnchanged`/`buildPersistedPatch` to
  `src/utils/simFramePersist.ts`; rewired `App.tsx` to write only changed
  fields to the persistent store each sim frame.
- Refactored `Outposts.tsx` to share a single `MeshBasicMaterial` across
  all beacon lights; the pulse animation now runs once per frame from the
  parent `useFrame` callback. Removed the unsafe `as MeshBasicMaterial`
  cast and the per-outpost `useFrame`.
- Replaced module-level `setAllowPersist` with explicit `pausePersist` /
  `resumePersist` helpers in `store.ts` and migrated `saveUtils.resetGame`
  to the new API. Updated three test files (`saveUtils.test.ts`,
  `saveUtils-import-export.test.ts`).
- Added `audit:prod` script (`npm audit --omit=dev --audit-level=high`) and
  wired it into `.github/workflows/ci.yml` along with `typecheck` and
  `lint` steps so CI now fails on prod-dep regressions.
- Tightened the `useDroneMeshInit` reinit key contract to `string | null`
  and updated the call site in `Drones.tsx` to compose a stable key from
  both geometry and material UUIDs.
- Suppressed jsdom's `Not implemented: navigation` warnings via a focused
  `process.stderr.write` filter in `tests/setup/setup.ts`. Vitest's
  process-stream interception runs above console overrides, so this is the
  only layer that can drop the noise.
- Added unit tests:
  - `tests/simFramePersist.test.ts` (11 cases covering `outpostsUnchanged`
    and `buildPersistedPatch`).
  - Persistence pause/resume cases in `tests/store.test.ts` (3 cases).
  - `tests/useDroneMeshInit.test.tsx` (3 cases validating the new key contract).
- Validation results:
  - `npm run typecheck` — green.
  - `npm run lint` — green.
  - `npm test` — 415 passed (1 file skipped), up from 398 in `TASK019`.
  - `npm run test:lifecycle` — 17 passed.
  - `npm run build` — green (chunk-size warning unchanged, not blocking).
  - `npm run audit:prod` — 0 vulnerabilities.
- PR opened against `main`.