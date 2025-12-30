# [TASK009] Design: Noise Replacement & Biome Mapping

**Status:** In Progress  
**Added:** 2025-12-30  
**Updated:** 2025-12-30

## Original Request
Replace sin/cos noise with a configurable OpenSimplex/Simplex provider, add biome mapping (temperature & moisture layers), and create automated visual validation (spawn-area screenshots). Start by writing design and task files.

## Thought Process
The work has two intertwined areas:
- Core terrain improvement (drop in a more natural noise function with deterministic seeding and a config flag); and
- Biome mapping (a small, deterministic layer that produces region-level variety).

To lower risk, we will add the noise provider behind a feature flag, add statistical sampling tests, and add headless screenshots for visual review before flipping defaults.

## Implementation Plan
- [ ] Draft design doc (this file created)
- [ ] Prototype/add `createNoiseProvider()` abstraction
- [ ] Add `simplex` provider using a seeded library
- [ ] Add config option `terrain.noiseType` and wire into `getSurfaceHeightCore`
- [ ] Add sampling test harness for multi-seed runs (update `tests/terrain-sampling.test.ts`)
- [ ] Add headless spawn-area screenshot test (Playwright) and storage under `verification/`
- [ ] Tune `surfaceBias`/`quantizeScale` defaults for `simplex`/`open-simplex`
- [ ] Add `biomes` module (temperature/moisture) and a simple biome rule table
- [ ] Add optional UI toggle to preview biome overlays (debug)
- [ ] Replace default `noiseType` only after acceptance

## Progress Log
### 2025-12-30
- Design document added to `memory/designs/DESIGN008-noise-and-biomes.md`.
- Task skeleton created and added to `_index.md`.
- Next step: create low-risk prototype `simplex` noise provider behind flag.

## Subtasks
| ID  | Description                              | Status     | Updated | Notes |
| --- | ---------------------------------------- | ---------- | ------- | ----- |
| 9.1 | Add noise provider abstraction           | Not Started|         |      |
| 9.2 | Add `simplex` provider (seeded)          | Not Started|         |      |
| 9.3 | Add sampling tests and reports           | Not Started|         |      |
| 9.4 | Add headless screenshot test harness     | Not Started|         |      |
| 9.5 | Add `biomes` module and UI overlay       | Not Started|         |      |


---
