# Active Context

## Current focus

- Project tooling and repo guidance are aligned for Vite bundling, Tailwind v4+, and a consistent tests layout.
- Refactor toward a Worker-authoritative engine with clean sim/render separation (`docs/ARCHITECTURE.md`).

## Recent changes

- Removed legacy `importmap` usage from `index.html`; runtime deps come from `node_modules` via Vite.
- Installed Tailwind v4+ and configured the official Vite plugin (`@tailwindcss/vite`).
- Added Tailwind entry file at `src/index.css` and imported it from `src/index.tsx`.
- Standardized tests to `tests/` and configured Vitest to only include that folder.
- Added `npm run lint:fix` and added repo agent guidance in root `AGENTS.md`.

## Next steps (suggested)

- Execute the sim/render separation refactor in phases (see `memory/tasks/_index.md`): `TASK004` → `TASK005` → `TASK006`.
- Continue config extraction work (`TASK003`) so balance knobs live in `src/config/*`.
- Keep an eye on bundle size warnings; revisit code-splitting later if it becomes annoying.
