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

### 2025-12-31

- **Save Migration System (PRs #99-101):** Added versioned save schema (v1→v2) with migration framework. Includes registry, validation, sanitization, and 36 comprehensive roundtrip tests. See `MIGRATION_SUMMARY.md` and `src/utils/migrations/`.
- **Meshing Priority Queue (#98):** Implemented chunk meshing priority queue with back-pressure to prevent worker overload. Adds configurable queue depth and tests for scheduler behavior.
- **Worker Error Handling:** Enhanced `createSimBridge` and `MeshingScheduler` with retry logic (up to 3 attempts), telemetry integration, and graceful degradation. Documented in `docs/ARCHITECTURE.md`.
- **Responsive UI & Touch Controls:** Enhanced UI with responsive design and added touch controls for mobile devices.
- **Player Collision Fix:** Adjusted player ground height calculation for improved accuracy.
- **CI Workflow Updates:** Commented out push/pull_request triggers in CI and profiling workflows for main branch.

### 2025-12-30

- Synchronized Memory Bank entries and design docs with `docs/ARCHITECTURE` changes: standardized `open-simplex` naming, replaced references to Playwright/screenshots with deterministic PPM-based visual baselining and visual-diff tests, and updated TASK009/TASK010/DESIGN008 to reflect the final implementation and baselines.
