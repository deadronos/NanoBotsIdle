# Active Context

## Current focus

- Project tooling and repo guidance are aligned for Vite bundling, Tailwind v4+, and a consistent tests layout.
- Refactor toward a Worker-authoritative engine with clean sim/render separation (`docs/ARCHITECTURE.md`).
- **Save system:** Versioned save schema with migration framework is complete (v1→v2).
- **Performance:** Meshing priority queue with back-pressure prevents worker overload.

## Recent changes

- **Save Migration System:** Added versioned save schema (v1→v2) with registry, validation, sanitization, and comprehensive tests. See `MIGRATION_SUMMARY.md`.
- **Meshing Priority Queue/Backpressure:** Implemented in `MeshingScheduler` with configurable queue depth.
- **Worker Error Handling:** Enhanced `createSimBridge` and `MeshingScheduler` with retry logic (3 attempts), telemetry, and graceful degradation.
- **Responsive UI:** Added responsive design and touch controls for mobile.
- **Player Collision:** Fixed ground height calculation for accurate standing position.
- Removed legacy `importmap` usage from `index.html`; runtime deps come from `node_modules` via Vite.
- Installed Tailwind v4+ and configured the official Vite plugin (`@tailwindcss/vite`).
- Standardized tests to `tests/` and configured Vitest to only include that folder.

## Next steps (suggested)

- Complete config extraction work (`TASK003`) so balance knobs live in `src/config/*`.
- Execute the sim/render separation refactor in phases (see `memory/tasks/_index.md`): `TASK004` → `TASK005` → `TASK006`.
- Keep an eye on bundle size warnings; revisit code-splitting later if it becomes annoying.
