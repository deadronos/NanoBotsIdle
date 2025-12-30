# DESIGN008 - Noise replacement (OpenSimplex) and Biome Mapping

**Status:** Accepted
**Added:** 2025-12-30
**Updated:** 2025-12-30

## Summary

Replace the current sin/cos-based procedural height generator with a configurable
noise provider (OpenSimplex; legacy sin/cos still supported) and add an optional biome layer driven
by extra noise maps (temperature and moisture). The immediate goal is to
improve base-terrain visual quality and provide a stable foundation for
biome-driven gameplay & visuals.

## Requirements (EARS-style)

- WHEN the world is generated (init or chunk ensure), THE SYSTEM SHALL compute
  surface heights using a selectable, seeded noise provider (OpenSimplex by
  default). [Acceptance: deterministic heights for given seed+coords; tests
  pass for deterministic outputs]

- WHEN the world is generated, THE SYSTEM SHALL provide a stable biome id per
  (x,z) using at least two noise layers (temperature, moisture) and the local
  quantized height. [Acceptance: biome mapping function returns one of the
  declared biome names and is deterministic by seed]

- WHEN a new noise provider is selected via config, THE SYSTEM SHALL maintain
  similar distribution characteristics (above-water fraction and height
  bounds) under tuned `surfaceBias` & `quantizeScale` defaults, and `initWorldForPrestige`
  shall still be able to find acceptable seeds within `genRetries`. [Acceptance:
  sampling tests and one multi-seed run pass thresholds]

## Design

1. Introduce a noise provider interface in `src/sim/noise.ts` via `createNoiseProvider(seed, type)`.
1. Provide built-in noise providers: `sincos` (legacy) and `open-simplex` (via `open-simplex-noise`).
1. Add `terrain.noiseType` config option (`sincos|open-simplex`) and ensure `getSeed(prestigeLevel)` seeds it deterministically.
1. Make `getSurfaceHeightCore()` and `getSmoothHeight()` use the provider's `noise2D()` instead of inline sin/cos.
1. Add biome mapping module `src/sim/biomes.ts` with `getBiomeAt(x, z, seed, surfaceY, waterLevel)` returning `{ id, heat01, moisture01 }`.
1. Add a debug visualizer toggle at `render.voxels.biomeOverlay.enabled` (world colors by biome).
1. Keep the generation fallback and `initWorldForPrestige()` retry loop; tune default parameters after sampling.

## Interfaces

- `createNoiseProvider(seed)` — returns object with `noise2D(x,z)` and `noise3D?(x,y,z)` (optional)
- `getBiomeAt(x,z,seed,surfaceY,waterLevel)` — returns biome id and climate metrics
- `getSurfaceHeightCore(x,z,seed,surfaceBias,quantizeScale)` — uses provider under the hood

## Tuning & Validation

- Add sampling tests (`tests/terrain-sampling.test.ts`) to verify per-seed
  distributions (min/max height, band percentages) and compare sincos vs
  simplex outputs. Use multiple seeds and compute averages.
- Add a headless visual test to capture a spawn-area screenshot for human
  review (Playwright or Node headless Three render). Store baseline images as
  `verification/` artifacts when approved.
- **Initial tuning result (2025-12-30)**: searching a small grid found a good
  match for `open-simplex` at **`surfaceBias = 2` and `quantizeScale = 3`**
  (matched `sincos` above-water fraction within ~0.6% across sample seeds).
  Use these as recommended starting defaults when switching `noiseType` to
  `open-simplex`, then validate more seeds and visual baselines before making
  the switch permanent.
- Validate `initWorldForPrestige()` still meets `prestigeMinMinedBlocks` for a
  majority of seeds within `genRetries`.

## Performance

- OpenSimplex sampling is more expensive than sin/cos; ensure calls remain in
  Worker context and add caching where possible (e.g., chunk-level cached
  heights) to avoid repeated sampling during meshing passes.

## Migration plan

1. Implement provider abstraction and add `simplex` provider behind flag.
2. Run sampling tests & adjust `surfaceBias`/`quantizeScale` for parity.
3. Add `open-simplex` provider and choose default after comparing visuals.
4. Implement `biomes` with conservative defaults and expose simple demo UI.

## Risks

- Visual differences may change gameplay (e.g., water vs land distribution)
  requiring re-tuning of progression configs.
- Additional dependency increases bundle/dev deps; lock versions and pollyfill if
  needed for worker use.

## Acceptance criteria

- New providers are implemented and configurable via `terrain.noiseType`.
- Sampling tests (multi-seed) show above-water fraction >= configured min in
  > 80% of seeds or `initWorldForPrestige` reliably finds acceptable seeds.
- Headless spawn-area screenshots are generated and reviewed, with baselines
  stored under `verification/`.
