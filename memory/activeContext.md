# Active Context

## Current focus

- Project tooling and repo guidance are now aligned for Vite bundling, Tailwind v4+, and a consistent tests layout.

## Recent changes

- Removed legacy `importmap` usage from `index.html`; runtime deps come from `node_modules` via Vite.
- Installed Tailwind v4+ and configured the official Vite plugin (`@tailwindcss/vite`).
- Added Tailwind entry file at `src/index.css` and imported it from `src/index.tsx`.
- Standardized tests to `tests/` and configured Vitest to only include that folder.
- Added `npm run lint:fix` and added repo agent guidance in root `AGENTS.md`.

## Next steps (suggested)

- Add real unit tests for `src/store.ts` upgrade costs and prestige multiplier.
- Consider lightweight code-splitting if bundle size warnings become problematic.
