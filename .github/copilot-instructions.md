# Copilot instructions — NanoBotsIdle (Voxel Walker)

This repository is a small React + React Three Fiber game prototype: a voxel-ish world with an autonomous mining-drone loop and an overlay UI. These instructions tell Copilot how to make changes that match the existing architecture, tooling, and performance constraints.

## Project summary

- Runtime: Vite + React (currently React 19 in `package.json`)
- 3D: `three`, `@react-three/fiber`, `@react-three/drei`
- State: `zustand` store in `src/store.ts`
- Tests: `vitest`
- Lint/format: ESLint (flat config wrapper) + Prettier
- UI styling: Tailwind v4+ via `@tailwindcss/vite` + `src/index.css`

Key gameplay loop:

- The world (`src/components/World.tsx`) generates a grid of mineable “surface blocks” using `noise2D()`.
- Drones (`src/components/Drones.tsx`) request targets from the `World` imperative API and mine blocks; mining adds credits (scaled by prestige level) into the Zustand store.
- UI (`src/components/UI.tsx`) reads store state and provides upgrades + prestige.

## Commands (use these)

- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Format: `npm run format`
- Tests: `npm test` (or `npm run test:watch`)

## Repo layout

- `src/App.tsx`: scene composition (Canvas + Environment + World + Player + Drones + UI)
- `src/components/World.tsx`: terrain instances + `WorldApi` (imperative ref)
- `src/components/Drones.tsx`: drone agents, per-frame logic, effects (particles/flash)
- `src/components/Player.tsx`: WASD movement + pointer lock camera
- `src/components/UI.tsx`: HUD + upgrade shop modal
- `src/store.ts`: zustand game economy + upgrade costs
- `src/utils.ts`: deterministic-ish helpers (noise, voxel color/value)
- `src/types.ts`: shared types (e.g., `ViewMode`)

## Coding style & conventions

### TypeScript

- Prefer explicit types at module boundaries (props, public helpers, store actions).
- Use `import type { ... }` for type-only imports (enforced by ESLint).
- Keep types in `src/types.ts` when shared across components.
- Avoid `any` unless there’s no practical alternative; if used, keep it local.

### Imports

- Keep imports sorted (ESLint `simple-import-sort`).
- Use the `@/*` alias when it improves clarity (configured in `tsconfig.json` and `vite.config.ts`).

### Formatting

- Formatting is owned by Prettier (`prettier.config.cjs`).
- Do not hand-format large blocks; run `npm run format` after changes.

### React

- Prefer function components + hooks.
- Follow the existing export style:
  - Components are named exports (e.g., `export const World ...`)
  - `App` is a default export.

### React Three Fiber / Three.js

- Treat `useFrame()` callbacks as performance-critical.
- Avoid allocations inside `useFrame()` (new `Vector3`, `Color`, arrays) unless truly needed.
  - Prefer `useRef()` / `useMemo()` to keep reusable `Vector3`, `Object3D`, `Matrix4`, etc.
- Prefer instancing for large counts (voxels, particles): use `InstancedMesh` and update `instanceMatrix.needsUpdate = true` only when necessary.
- Prefer `useLayoutEffect` to initialize instance matrices/colors before paint.
- Use `refs` to mutate Three objects; this codebase intentionally uses mutation for scene objects.

## Gameplay/state rules (match existing behavior)

- Economy and upgrades live in the Zustand store (`src/store.ts`).
  - If you add a new upgrade, you must:
    - Add state fields + actions in the store
    - Add cost calculation in `getUpgradeCost()`
    - Wire UI in `ShopModal` in `src/components/UI.tsx`
    - Apply the effect in the relevant system (e.g., drones/player/world)
- Prestige is modeled as `prestigeLevel` and is used as a multiplier when mining.
- World generation is seeded via prestige level in `World.tsx`.

## Input & UI interaction gotchas

- Pointer lock is handled in `Player.tsx` via `document.body.requestPointerLock()`.
- UI overlay uses `pointer-events-none` at the top-level container and re-enables interaction per panel with `pointer-events-auto`.
- If you add clickable UI inside modals, prevent pointer-lock capture by stopping event propagation (see `ShopModal`’s click handler pattern).
- Keep `Escape` support for closing modals when appropriate.

## Security & secrets

- Do not hardcode API keys.
- `vite.config.ts` currently injects `process.env.GEMINI_API_KEY` into the build; keep secrets in `.env` files and reference them via Vite’s `loadEnv` only.
- Avoid logging sensitive values.

## Testing guidance (Vitest)

- Tests live in `src/*.test.ts(x)` and use Vitest.
- Prefer small, deterministic unit tests for store logic and utility functions.
- For 3D rendering logic, prefer testing pure helpers (e.g., cost functions, noise/value mapping) and keep `useFrame` logic testable by extracting pure functions when feasible.

## Change guidelines (how to make PR-sized edits)

- Make surgical edits: change the minimum code needed for the requested feature/bugfix.
- Preserve public component props and exported types unless explicitly changing an API.
- Keep the game loop stable:
  - Avoid adding expensive per-frame operations (e.g., scanning all voxels every frame).
  - Prefer bounded searches (as in `WorldApi.getRandomTarget()`’s attempt limit).
- When touching performance-sensitive areas, prefer these patterns:
  - Cache computed data in `useMemo`
  - Keep mutable state in refs (`useRef`) to avoid rerenders
  - Batch instance updates rather than updating per-instance every frame

## Dependency/loading rules

- This repo should use Vite bundling + installed npm packages for React/Three/R3F/Zustand.
- Do not add `importmap`-based overrides (e.g., esm.sh) for runtime dependencies.
