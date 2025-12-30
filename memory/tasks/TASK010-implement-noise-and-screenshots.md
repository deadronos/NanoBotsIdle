# [TASK010] Implement: OpenSimplex provider, Tests & Visuals

**Status:** Completed  
**Added:** 2025-12-30  
**Updated:** 2025-12-30

## Progress Log

### 2025-12-30

- Implemented `open-simplex` provider, sampling & tuning tests, and PPM visual baselines + visual-diff tests.
- Updated Memory Bank docs to reflect PPM-based baselining and confirmed default `terrain.noiseType` is `open-simplex`.


**Summary of completion:** Implemented `open-simplex` provider, sampling & tuning tests, PPM visual baselining, per-baseline thresholds, a baseline update helper, and a CI workflow that runs visual diff tests.

## Original Request
Implement a new noise provider (OpenSimplex), add tests and sampling reports, and create automated spawn-area PPM baselines for visual review; optionally follow with biome mapping.

## Implementation Plan (detailed)
1. Dependency & build
   - Add `open-simplex-noise` or `simplex-noise` (evaluate both); add to `devDependencies` and lock version.
   - Ensure the library works in a Worker context (no DOM assumptions).

2. API & code
   - Create `src/sim/noise.ts` with:
     - `type NoiseProvider = { noise2D(x:number,z:number): number }`
     - `createNoiseProvider(seed:number, type: 'sincos'|'open-simplex')`
   - Implement `open-simplex` provider using `open-simplex-noise` (seeded via `makeNoise2D`).
   - Keep `sincos` provider for parity (reuse current `noise2D` impl) to aid tuning and regression.
   - Update `src/sim/terrain-core.ts` to depend on `createNoiseProvider()`.

3. Config
   - Add `terrain.noiseType` to `src/config/terrain.ts` (default: `'open-simplex'` after tuning).
   - Add tests for config parsing and default behaviors.

4. Tests & sampling
   - Extend `tests/terrain-sampling.test.ts` to support a matrix of noise types and seeds and to produce a deterministic report (already added test harness will be extended).
   - Add a regression test asserting that `initWorldForPrestige()` can find acceptable seeds for default params in the majority of test seeds.

5. Visual tests
   - Add a Node-based PPM generator and visual-diff harness (scripts/generate-baselines.js + `tests/visual-diff.test.ts`).
   - Implement a headless top-down PPM render (pure Node + `getSurfaceHeight` + `getVoxelColor`) to produce deterministic maps for given seeds and config.
   - Store approved baselines under `verification/baselines/` and add per-baseline thresholds in `verification/baselines/meta.json`; CI runs diffs and reports regressions.

6. Tuning & roll-out
   - Run multi-seed sampling with `sincos` and `open-simplex` providers; auto-generate recommended `surfaceBias`/`quantizeScale` pairs for parity (goal: similar above-water fraction).
   - After visual approval, change default `terrain.noiseType` to `open-simplex` and update docs/DEC accordingly.

7. Biomes (follow-up)
   - Add `src/sim/biomes.ts` and a debug overlay in the UI to preview the biome map.
   - Create acceptance tests that rely on deterministic outputs for seed+coord pairs.

## Acceptance Criteria

- New noise providers implemented and selectable via config (`terrain.noiseType`).
- Tests show deterministic outputs and sampling reports for `sincos` and `open-simplex` providers.
- PPM-based spawn-area baselines (under `verification/baselines/`) exist and are validated by automated visual-diff tests.
- `initWorldForPrestige()` continues to prevent soft-locks in practice (most seeds pass within `genRetries`).
- Baselines are generated for at least three (seed,size) combinations and stored in `verification/baselines` with per-baseline thresholds defined in `verification/baselines/meta.json`.
- Visual diff tests are automated and run in CI; thresholds are tuned per-baseline.

## Risks & Mitigations

- Visual regressions: provide visual baselines and human review before switching defaults.
- Performance: sample rates and per-chunk caches mitigate over-sampling in hot paths.


---
