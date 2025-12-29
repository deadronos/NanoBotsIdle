# Tech Context

## Stack

- Runtime: Vite + React 19
- 3D: Three.js + @react-three/fiber + @react-three/drei
- State: Zustand
- Styling: Tailwind v4+ via `@tailwindcss/vite` and `src/index.css`
- Tests: Vitest (tests live under `tests/`)
- Lint/Format: ESLint + Prettier

## Common commands

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint` / `npm run lint:fix`
- `npm run typecheck`
- `npm test` / `npm run test:watch`

## Conventions

- Prefer `import type { ... }` for type-only imports.
- Prefer the `@/*` path alias for `src/*` when it improves clarity.
