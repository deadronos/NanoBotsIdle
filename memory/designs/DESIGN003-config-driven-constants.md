# [DESIGN003] Config-driven Constants & Magic Value Extraction

**Status:** Proposed
**Added:** 2025-12-29
**Updated:** 2025-12-29

## Summary

Replace remaining hard-coded "magic" numbers and monolithic constants with a **config-driven**, typed, and testable system under `/src/config`. The system will be domain-split (terrain, player, rendering, economy, app), data-driven, support build-time (env) and optional runtime overrides (static `/config.json` or in-memory overrides), and include a scan + lint workflow to detect regressions.

This design complements DESIGN002 (terrain centralization) by making tuning values discoverable, documented, and configurable without editing source code directly.

## Background / Problem Statement

After centralizing some constants into `src/constants.ts`, there remain numerous hard-coded numeric literals and inline tuning values across components and tests. These "magic numbers" reduce discoverability, make tuning harder, and increase regression risk when values migrate or need to be tuned per environment (dev/staging/prod).

## Goals

- Centralize and domain-split runtime tuning into `/src/config` with **typed defaults** and a lightweight loader.
- Support build-time overrides (environment variables) and optional runtime overrides (e.g., /config.json or `window.__APP_CONFIG__`) to support experimentation and remote tuning.
- Provide a small scanning tool and ESLint rules to detect new magic numbers and prevent regressions.
- Use TDD: write failing tests for expected behavior (scan detects candidates; config loader merges overrides), then implement code to make tests pass.

## Non-goals

- This design does not mandate a specific remote configuration service (that can be added later). It also avoids adding heavyweight dependencies; validation libraries like `zod` may be offered as an optional follow-up.

## Proposed Config Structure

/src/config
- index.ts — Central loader + typed `Config` interface + `getConfig()` and `updateConfig(partial)` helpers
- terrain.ts — `TerrainConfig` + `defaultTerrainConfig`
- player.ts — `PlayerConfig` + `defaultPlayerConfig`
- render.ts — `RenderConfig` + `defaultRenderConfig`
- economy.ts — `EconomyConfig` + `defaultEconomyConfig`
- env.ts — Utilities to read `import.meta.env` / `process.env` mappings into typed partials
- loader.ts — Optional runtime loader for `/config.json` and env merging

Examples

// /src/config/terrain.ts (pseudo)
export type TerrainConfig = {
  baseSeed: number;
  prestigeSeedDelta: number;
  worldRadius: number;
  surfaceBias: number; // bias applied to raw noise before quantization
  quantizeScale: number; // multiply before floor()
  waterLevel: number;
};

export const defaultTerrainConfig: TerrainConfig = {
  baseSeed: 123,
  prestigeSeedDelta: 99,
  worldRadius: 30,
  surfaceBias: 0.6,
  quantizeScale: 4,
  waterLevel: 0.2,
};

// /src/config/index.ts (pseudo)
export type Config = {
  terrain: TerrainConfig;
  player: PlayerConfig;
  render: RenderConfig;
  economy: EconomyConfig;
};
let _config: Config = {
  terrain: defaultTerrainConfig,
  player: defaultPlayerConfig,
  render: defaultRenderConfig,
  economy: defaultEconomyConfig,
};
export const getConfig = () => _config;
export const updateConfig = (partial: Partial<Config>) => { _config = deepMerge(_config, partial) };

## Loading & Overrides

- Merge order (lowest → highest): Defaults → build-time/env overrides → runtime static `/config.json` → explicit `updateConfig()` calls.
- Build-time overrides use `import.meta.env` or process env prefixed values (e.g., `VITE_TERRAIN_BASE_SEED=...`); `env.ts` converts string values to typed primitives.
- Runtime overrides are optional and loaded from `/config.json` on startup (vanilla fetch + merge). This allows deploying config changes without rebuilding the app.

## Scanning & Prevention (No-Magic-Numbers)

- Add a `scripts/find-magic-values.js` scanner that uses an AST parser (Babel / espree) to find numeric literals in `src/` and report locations and contextual info (file, line, suggestion).
- Add an ESLint rule configuration `no-magic-numbers` that runs in CI. We'll configure it strictly for `src/` but allow a small list of harmless numbers (e.g., -1, 0, 1, 2 where appropriate).
- Add `tests/magic-values.test.ts` (TDD: fail first) that asserts zero *unauthored* magic numbers (allowlist exceptions listed in config).

## Migration Strategy (TDD-driven)

1. Scan repository to gather candidate magic values (TDD: add failing `tests/magic-values.test.ts` that asserts `scripts/find-magic-values.js` output length > 0 so we can iterate).  
2. Design domain config shape and add default config files under `/src/config`. Add unit tests asserting defaults match current behavior (e.g., terrain bias and quantize rules), and add compatibility tests that confirm behavior remains identical for sample points.  
3. Implement central loader (`/src/config/index.ts`) and env parsing.  
4. Gradually migrate modules to use config values (update `World.tsx`, `Player.tsx`, `Drones.tsx`, `store.ts`, UI labels, etc.), replacing literal numbers with imports from the config. For each migration step: add a small unit test that locks old vs new values.  
5. Add/enable ESLint `no-magic-numbers` with reasonable allowlist and run in CI.  
6. Add runtime `/config.json` loader, and optional dev UI to toggle config if desired.

## Testing & CI

- Unit tests for each domain config (defaults, types).  
- Integration tests confirming behavior doesn't change: sample grid points, player-ground height, mine yield multipliers.  
- Add a CI job to run `scripts/find-magic-values.js` and fail if newly discovered magic values are found (unless explicitly allowlisted).  

## Acceptance Criteria

- All previously flagged magic values are accounted for or moved to a domain config file in `/src/config`.  
- Config loader provides `getConfig()` and `updateConfig()` with typing and validation.  
- Tests exist for defaults and env/runtime overrides and pass.  
- ESLint rule for magic numbers runs in CI and prevents new magic values from being introduced without an allowlist entry.

## Performance & Safety

- Config access should be cached and allocation-free for hot paths.  
- Avoid blocking network loads at startup; fetch runtime config asynchronously and merge (with sensible default fallbacks in place).  
- Keep config validation lightweight; optionally use `zod` in a follow-up if stronger validation is required.

## Risks & Mitigations

- False positives in magic-value scanning: mitigate with allowlist and review process.  
- Visual/behaviour drift: mitigate with sample-based compatibility tests and manual spot-checks.

## Estimated Effort

- Scan + design + tests: 2–4 hours (PoC).  
- Implement loader + domain configs + tests + small migrations: 1–2 days.  
- Full migration + CI integration + docs: 1–3 days depending on scope and review cycles.

---

**Implementation status (2025-12-29):**

- Implemented `scripts/find-magic-values.js` (regex-based POC scanner) and `tests/magic-values.test.ts` (TDD).  
- Scaffolding added under `/src/config`: `index.ts` loader and domain files `terrain.ts` and `player.ts` with typed defaults.  
- Migrated `src/sim/terrain.ts` to consume `getConfig()` (surface bias and quantize scale now driven by config).
- Migrated economy base costs into `src/config/economy.ts` and updated `src/store.ts` to use `getConfig().economy.baseCosts`.
- Added `tests/config-defaults.test.ts`, `tests/config-overrides.test.ts`, `tests/config-env.test.ts` and verified all tests pass locally.
- Ran `scripts/find-magic-values.js`: found **484** candidate magic values across the `src/` tree. A snapshot of top candidates is saved at `memory/reports/magic-values-2025-12-29.txt`. Priorities for migration: economy (done), drones physics (moveSpeed/mineDuration), player tuning (mostly done), rendering/environment tuning, and particle constants.

**Next step (TDD):** Add `src/config/env.ts` to map `import.meta.env` into typed overrides, add ESLint `no-magic-numbers` enforcement, and continue migrating modules to the config loader in small, test-backed steps.
