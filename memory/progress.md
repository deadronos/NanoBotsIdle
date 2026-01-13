# Progress

## Working

- Game loop: drones mine blocks, credits accrue, upgrades/presitge available.
- Rendering: instanced voxels + basic environment.
- Tooling: Tailwind v4+ via Vite plugin, ESLint/Prettier, Vitest.

## In progress / next

- Expand test coverage (store + utility functions).
- Tune performance as drone counts increase (avoid allocations in `useFrame()`).
- Plan/execute worker-authoritative engine refactor (protocol + engine + deltas), per `docs/ARCHITECTURE.md`.
- Migrate voxel keying/edit storage to BVX-backed helpers for mining/frontier consistency.

## Known notes

- Vite build warns about large chunks (>500kB) after minification; not currently blocking.

## Recent updates

### 2026-01-13

- Integrated BVX-backed voxel keying and edit storage for mined voxel overrides.
- Updated frontier/debug tracking and tests to use numeric BVX keys.

### 2026-01-02

- **Progressive LOD:** Added coarse-first LOD refinement with configurable delay in meshed rendering.
- **Occlusion Culling:** Wired optional WebGL2 occlusion queries into meshed chunk visibility.
- **Benchmarking:** Added draw-call telemetry and profiling presets for heavy meshed scenes.

### 2026-01-01

- **Smart Queuing (Logistics):** Implemented outpost traffic management to prevent drone congestion.
  - **Limited Slots:** Outposts now have 4 docking slots.
  - **Orbital Queuing:** Drones denied docking enter an orbital queuing state above the outpost.
  - **Visual Feedback:** Queuing drones turn yellow to signal congestion to the player.
  - **Protocol:** Updated main thread/worker synchronization for queue states.

- **Chunk LOD System (Performance):** Implemented distance-based Level of Detail.
  - **LOD0 (< 6 chunks):** Full InstancedMesh rendering.
  - **LOD1-2 (6-12 chunks):** Simplified "Proxy Buffers" (currently colored boxes) to reduce draw calls and vertex count.
  - **Unloading (> 12 chunks):** Aggressive cleanup of distant chunk memory.

- **Typed Worker Bridge (Reliability):**
  - Integrated `zod` for runtime validation of all `ToWorker` and `FromWorker` messages.
  - Prevents silent serialization failures and "undefined property" bugs between threads.

- **Typed Worker Bridge (Reliability):**
  - Integrated `zod` for runtime validation of all `ToWorker` and `FromWorker` messages.
  - Prevents silent serialization failures and "undefined property" bugs between threads.

- **Visual & Thematic Enhancements:**
  - **Strata & Biomes:** Implemented depth-based terrain coloring (Surface, Stone, Deep Crystal).
  - **"Juice" Effects:** Added particle bursts for mining and floating text for resource deposits.
  - **Architecture:** Documented event-driven visual system in `docs/ARCHITECTURE/DEC008-visual-effects-system.md`.

- **UI Improvements:**
  - **Scrollable Panels:** Fixed `ShopModal` layout to handle small screens/overflowing content gracefully.
### 2025-12-31

- **Hotpath Performance Optimizations:** Significantly reduced main-thread CPU usage during meshing and movement.
  - Implemented 3-layered strategy: reduced worker concurrency (`maxInFlight: 4`), per-frame result batching (`maxMeshesPerFrame: 4`), and worker-side bounding sphere pre-computation.
  - Added 150ms debounce to `reprioritizeDirty()` to optimize movement overhead.
  - Integrated optional frame handler timing for easier profiling.
  - Consolidated documentation into `docs/ARCHITECTURE/TECH005-performance-optimizations.md`.

- **Logistics System (Phase 3):** Implemented Hauler drones and Outpost persistence (`TASK013`, `DESIGN009`).
  - **Hauler Drones:** New role dedicated to transport. Includes AI for intercepting miners and depositing cargo.
  - **Outposts:** Persistent player-placed structures serving as drop-off points.
  - **UI/Economy:** Shop integration and visual distinction (role-based coloring).
  - **Architecture:** Documented in `docs/ARCHITECTURE/GAME002-logistics-and-economy.md`.

- **UI Polish:** Adjusted `BuildingDrawer` positioning to avoid overlaps on desktop/mobile.

### 2025-12-31 (Previous)

- **Save Migration System (PRs #99-101):** Added versioned save schema (v1→v2) with migration framework. Includes registry, validation, sanitization, and 36 comprehensive roundtrip tests. See `MIGRATION_SUMMARY.md` and `src/utils/migrations/`.
- **Meshing Priority Queue (#98):** Implemented chunk meshing priority queue with back-pressure to prevent worker overload. Adds configurable queue depth and tests for scheduler behavior.
- **Worker Error Handling:** Enhanced `createSimBridge` and `MeshingScheduler` with retry logic (up to 3 attempts), telemetry integration, and graceful degradation. Documented in `docs/ARCHITECTURE.md`.
- **Responsive UI & Touch Controls:** Enhanced UI with responsive design and added touch controls for mobile devices.
- **Player Collision Fix:** Adjusted player ground height calculation for improved accuracy.
- **CI Workflow Updates:** Commented out push/pull_request triggers in CI and profiling workflows for main branch.

### 2025-12-30

- Synchronized Memory Bank entries and design docs with `docs/ARCHITECTURE` changes: standardized `open-simplex` naming, replaced references to Playwright/screenshots with deterministic PPM-based visual baselining and visual-diff tests, and updated TASK009/TASK010/DESIGN008 to reflect the final implementation and baselines.
