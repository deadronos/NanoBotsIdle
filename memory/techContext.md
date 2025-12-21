# Tech Context

## Stack

- React 19 (`react`, `react-dom`)
- React Three Fiber + Drei (`@react-three/fiber`, `@react-three/drei`) on Three.js (`three`)
- Zustand for UI/light state (`zustand`)
- Vite dev/build pipeline (`vite`) with SWC React plugin (`@vitejs/plugin-react-swc`)
- TypeScript 5.x (strict)

See `package.json` for exact versions.

## Local workflows

- Dev server: `npm run dev`
  - Port is fixed to 5173 (`vite.config.ts`: `strictPort: true`).
- Build: `npm run build` (TypeScript project build + Vite)
- Preview: `npm run preview`

## Performance-related implementation notes

- WebGL settings in `src/game/GameCanvas.tsx` are chosen for speed:
  - `gl={{ antialias: false, powerPreference: "high-performance" }}`
  - `dpr={[1,2]}`
- CPU work is intentionally bounded per frame (chunk rebuilds and mesh swaps).

## Testing

- There is currently no test runner configured in `package.json`.
- When adding tests, prefer pure logic units (voxel math, chunk indexing, raycast edge cases, crafting rules) over brittle render tests.
