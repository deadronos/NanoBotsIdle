# DEC006: Noise Implementation & World Init Retry Behavior

**Status:** Accepted
**Last updated:** 2025-12-30

## Context

Historical docs described terrain generation as using "Perlin" noise. During a rapid prototype phase, a deterministic sum-of-sines/cosines function was used instead (`src/sim/terrain-core.ts`). This function is simple, deterministic, and fast for the current prototype; however, it has different frequency/amplitude characteristics than canonical Perlin/OpenSimplex noise.

Separately, to prevent prestige-time soft-locks (where a generated world offers too few above-water mineable voxels for starter drones), an initialization retry strategy was added that regenerates candidate seeds and selects the first candidate that meets a configurable minimum frontier criterion.

## Decision

1. Keep the current deterministic sin/cos-based noise implementation for the prototype. Its trade-offs are:
   - Pros: simple, deterministic, and easy to reason about during early iteration; fast and easy to test.
   - Cons: less natural/coherent-looking compared to Perlin/OpenSimplex in some cases; parameters will need careful tuning to avoid edge cases.

2. Use an explicit initialization check and bounded retry strategy during prestige-time world init.
   - Implementation location: `src/engine/world/initWorld.ts` (`initWorldForPrestige`).
   - Behavior: derive `candidateSeed = baseSeed + attempt * 101` for attempt = 0..`genRetries`; accept the first seed whose `initializeFrontierFromSurface()` returns a frontier size >= `cfg.economy.prestigeMinMinedBlocks`.
   - If no candidate meets the requirement, fall back to `baseSeed` and proceed.

## Rationale

- Prevents deterministic soft-locks where a randomly chosen seed would produce too few mineable blocks for player progression at prestige-time.
- Keeps initialization bounded and predictable (max attempts = `terrain.genRetries`).
- Keeps the prototype moving: changing noise implementations is higher-risk and should happen only if we need more natural-looking terrain or to achieve specific distribution guarantees.

## Consequences

- The codebase must document the noise function and key parameters (see `src/sim/terrain-core.ts`, `src/config/terrain.ts`) so designers can tune `surfaceBias`, `quantizeScale`, and `waterLevel` with realistic expectations.
- If the project later moves to Perlin/OpenSimplex noise for better visual fidelity, update this DEC with a migration plan and add tests that assert distribution properties (e.g., minimum above-water frontier guarantee under tuned parameters).

## Action items

- Add documentation in `docs/ARCHITECTURE.md` and `TECH002-voxel-world-model.md` describing the implementation and init retry behavior (completed 2025-12-30).
- Add tests that verify `initWorldForPrestige()` respects the `prestigeMinMinedBlocks` minimum when possible (added to tests on 2025-12-30).
- **Default change (2025-12-30)**: After tuning, the default noise provider was switched to `open-simplex` and tuned parameters (`surfaceBias=2`, `quantizeScale=3`) were adopted to preserve above-water distribution characteristics while improving terrain coherence.
