# DEC006: Noise Implementation & World Init Retry Behavior

**Status:** Accepted
**Last updated:** 2025-12-30

## Context

Historical docs described terrain generation as using "Perlin" noise. During a rapid prototype phase, a deterministic sum-of-sines/cosines function was used instead. The project has since added a configurable noise provider abstraction and switched the default provider to OpenSimplex for improved coherence, while keeping the legacy sin/cos provider for parity and tuning.

Separately, to prevent prestige-time soft-locks (where a generated world offers too few above-water mineable voxels for starter drones), an initialization retry strategy was added that regenerates candidate seeds and selects the first candidate that meets a configurable minimum frontier criterion.

## Decision

1. Use an explicit noise provider abstraction (`src/sim/noise.ts`) selected via config `terrain.noiseType`.
   - Default provider: `open-simplex`.
   - Legacy provider retained: `sincos` (for parity/regression and tuning comparisons).
   - OpenSimplex implementation uses `open-simplex-noise` (`makeNoise2D`) with frequency and amplitude scaling (see `src/sim/noise.ts`).

2. Use an explicit initialization check and bounded retry strategy during prestige-time world init.
   - Implementation location: `src/engine/world/initWorld.ts` (`initWorldForPrestige`).
   - Behavior: derive `candidateSeed = baseSeed + attempt * 101` for attempt = 0..`genRetries`; accept the first seed whose `initializeFrontierFromSurface()` returns a frontier size >= `cfg.economy.prestigeMinMinedBlocks`.
   - If no candidate meets the requirement, fall back to `baseSeed` and proceed.

3. Treat terrain visuals as a testable artifact.
   - `tests/visual-diff.test.ts` compares generated PPM maps against approved baselines under `verification/baselines/`.
   - Per-baseline thresholds live in `verification/baselines/meta.json`.
   - Baselines are updated locally via `npm run update:baselines` (CI runs the diff; it does not overwrite baselines).

## Rationale

- OpenSimplex provides more coherent terrain patterns than the legacy sin/cos generator while remaining deterministic and seedable.
- Keeping `sincos` as an option makes it easy to compare distributions and avoid regressions during tuning.
- The bounded init retry strategy prevents deterministic prestige-time soft-locks while keeping initialization predictable (max attempts = `terrain.genRetries`).
- Visual baselines provide a pragmatic guardrail: terrain changes are expected, but large unintended diffs should be caught early.

## Consequences

- The codebase must document the active noise providers and key parameters (see `src/sim/noise.ts`, `src/config/terrain.ts`) so designers can tune `surfaceBias`, `quantizeScale`, and `waterLevel` with realistic expectations.
- Any change that affects terrain distributions or visuals should update sampling tests and, if intended, refresh `verification/baselines/` and thresholds.

## Action items

- Add documentation in `docs/ARCHITECTURE.md` and `TECH002-voxel-world-model.md` describing the implementation and init retry behavior (completed 2025-12-30).
- Add tests that verify `initWorldForPrestige()` respects the `prestigeMinMinedBlocks` minimum when possible (added to tests on 2025-12-30).
- **Default change (2025-12-30)**: After tuning, the default noise provider was switched to `open-simplex` and tuned parameters (`surfaceBias=2`, `quantizeScale=3`) were adopted to preserve above-water distribution characteristics while improving terrain coherence.
