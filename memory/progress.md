# Progress

## Working

- Game loop: drones mine blocks, credits accrue, upgrades/presitge available.
- Rendering: instanced voxels + basic environment.
- Tooling: Tailwind v4+ via Vite plugin, ESLint/Prettier, Vitest.

## In progress / next

- Expand test coverage (store + utility functions).
- Tune performance as drone counts increase (avoid allocations in `useFrame()`).
- Plan/execute worker-authoritative engine refactor (protocol + engine + deltas), per `docs/ARCHITECTURE.md`.

## Known notes

- Vite build warns about large chunks (>500kB) after minification; not currently blocking.

## Recent updates

### 2025-12-30

- Synchronized Memory Bank entries and design docs with `docs/ARCHITECTURE` changes: standardized `open-simplex` naming, replaced references to Playwright/screenshots with deterministic PPM-based visual baselining and visual-diff tests, and updated TASK009/TASK010/DESIGN008 to reflect the final implementation and baselines.
