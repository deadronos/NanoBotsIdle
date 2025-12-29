# System Patterns

## Architecture overview

- `src/App.tsx` composes the scene: `Environment`, `World`, `Player`, `Drones`, `UI`.
- `World` exposes an imperative `WorldApi` via ref to serve targets to drones and apply mining changes.
- `Drones` runs the agent loop in `useFrame()` and triggers world mutations via `WorldApi`.
- `src/store.ts` (Zustand) owns economy, upgrades, and prestige.

## Rendering/perf patterns

- Use `InstancedMesh` for large counts (voxels, particle cubes).
- Initialize instance matrices/colors in `useLayoutEffect`.
- Minimize work inside `useFrame()`; prefer cached `Vector3`/`Object3D`/`Matrix4` in refs/memos.

## Interaction patterns

- Pointer lock is requested on body clicks; UI modals stop propagation so clicks don’t re-lock.
- UI overlay uses `pointer-events-none` at the container level and enables interaction per panel.
