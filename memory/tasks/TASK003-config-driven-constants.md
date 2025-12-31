# [TASK003] - Config-driven constants & magic-value extraction

**Status:** In Progress  
**Added:** 2025-12-29  
**Updated:** 2025-12-29

## Original Request

Scan the source for hard-coded or "magic" values and extract all constants into a `/src/config` folder with domain-specific files, a central loader/merger, and support for env/runtime overrides. Follow a TDD workflow: write failing tests that model expected behavior (scan & config loading), then implement the code to make tests pass.

## Thought Process

This task extends DESIGN003: a small, iterative approach reduces risk. We'll start by adding a scanner (TDD failing test), then scaffold `/src/config` and domain files (`terrain`, `player`, `render`, `economy`), implement a loader and env parsing, add tests, and progressively migrate callers in small, test-covered steps.

## Implementation Plan (TDD)

1. Add a failing test `tests/magic-values.test.ts` that requires `scripts/find-magic-values.js` to return scanned candidates. Verify it fails.  
2. Implement `scripts/find-magic-values.js` (AST-based scanner that finds numeric literals and returns contextual info).  
3. Create `/src/config` scaffolding and add `index.ts` loader (singleton), a typed `Config` interface, and `updateConfig()` for runtime overrides.  
4. Add domain config files with defaults (`terrain.ts`, `player.ts`, `render.ts`, `economy.ts`).  
5. Add `tests/config-defaults.test.ts` & `tests/config-overrides.test.ts` (env & runtime override behavior).  
6. Implement mapping from `import.meta.env` (Vite) into typed partial config via `src/config/env.ts`.  
7. Add and enforce an ESLint `no-magic-numbers` configuration with a project allowlist; add an automated script wrapper to fail CI on new magic numbers unless allowlisted.  
8. Migrate code incrementally (World, Player, store.economy, Drones, UI) to import config values (one module at a time); for each migration add tests that assert old vs new behavior parity.  
9. Add docs and usage examples (`docs/config.md`) and update `memory/designs/DESIGN003...` with final notes.  
10. Prepare PR with migration notes and targeted changelog entries.

## Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 3.1  | Add TDD scan test (`tests/magic-values.test.ts`) | Completed | 2025-12-29 | Added TDD test and implemented `scripts/find-magic-values.js` scanner. |
| 3.2  | Implement `scripts/find-magic-values.js` (AST scanner) | Completed | 2025-12-29 | Implemented a pragmatic scanner (regex-based) and CLI wrapper `runCli()`; will evolve to AST-based parser later. |
| 3.3  | Create `/src/config` scaffolding & loader (`index.ts`) | Completed | 2025-12-29 | Implemented `getConfig()`, `updateConfig()` and `resetConfig()`. |
| 3.4  | Add domain config files (`terrain`, `player`, `render`, `economy`) | Completed | 2025-12-29 | Added `terrain` and `player` domain defaults; `render`/`economy` placeholders planned. |
| 3.5  | Add env parsing & tests (`src/config/env.ts`) | Not Started | - | Map `import.meta.env` keys into typed partials (planned). |
| 3.6  | Add tests for default & override behavior | Completed | 2025-12-29 | Added `tests/config-defaults.test.ts` and `tests/config-overrides.test.ts`. |
| 3.7  | Add ESLint `no-magic-numbers` + CI wrapper | Not Started | - | Document allowed exceptions and add `scripts/check-magic-values.js`. |
| 3.8  | Migrate modules (World, Player, Drones, store) | In Progress | 2025-12-29 | Terrain module migrated to use config values; further migrations planned in small steps. |
| 3.9  | Add docs & update design memory | Not Started | - | Update `docs/config.md` and `memory/designs/DESIGN003...`. |
| 3.10 | PR & changelog | Not Started | - | Include migration notes, examples, and `how-to` for runtime overrides. |

## Progress Log

### 2025-12-29

- Created `DESIGN003` (config-driven constants) and `TASK003` (this task) and marked subtask **3.1 Add TDD scan test** as **In Progress**.

### 2025-12-29 - Implementation Update

- Implemented TDD scan test `tests/magic-values.test.ts` and `scripts/find-magic-values.js` scanner (regex-based POC).

- Scaffolding: Added `/src/config` with `index.ts` loader, `terrain.ts`, and `player.ts` domain defaults.

- Migrated `src/sim/terrain.ts` to consume `getConfig()` (bias & quantization scale now configurable).

- Migrated economy base costs into `src/config/economy.ts` and updated `src/store.ts` to use `getConfig().economy.baseCosts` (tests added/updated).

- Added tests: `tests/config-defaults.test.ts`, `tests/config-overrides.test.ts`, `tests/config-env.test.ts` and verified all tests pass locally.

**Next action:** add ESLint `no-magic-numbers` enforcement in CI, continue migrating modules (Drones, render tuning, UI), and add a reviewable PR with these changes.

## Acceptance Criteria

- `scripts/find-magic-values.js` returns a comprehensible list of candidate magic values (file/line/value/context).  
- `/src/config` contains domain config files with typed defaults for terrain and player at minimum.  
- `getConfig()` merges defaults and overrides and is used by at least `World.tsx` and `Player.tsx` (can be staged in small migrations).  
- ESLint `no-magic-numbers` rule runs in CI with documented allowlist.  
- Tests for defaults, env overrides, runtime overrides pass in CI.

## Risks & Mitigation

- Scanning false positives: mitigate with allowlist + human review.  
- Unexpected behavior change during migration: mitigate with sample-based compatibility tests and incremental PRs.

---

**Notes:** This work follows the TDD pattern: write failing tests (scan + loader contract), implement minimal functionality to pass tests, then refactor & migrate callers while keeping tests green.
