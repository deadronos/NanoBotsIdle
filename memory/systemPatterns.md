# System Patterns

## Architecture overview (current)
- `src/App.tsx` composes the scene: `Environment`, `World`, `Player`, `Drones`, `UI`.
- Simulation runs in a Worker (`src/worker/sim.worker.ts`) and sends deltas to the main thread via `src/simBridge/simBridge.ts`.
- `World` renders voxel chunks/instances on the main thread and applies Worker edits to the collision proxy.
- `Drones` renders purely from Worker pose/target/state deltas (no sim logic in `useFrame()`).
- Zustand (`src/ui/store.ts`) is a read-only UI snapshot + panel state.

## Terrain & Water Strategy
- **Configuration-Driven**: Water level, surface bias, and scale are handled via `src/config/terrain.ts`, not hardcoded constants.
- **Unified Water Logic**: All systems (render, physics, AI) share the same `waterLevel` configuration to prevent visual/logical mismatches.
- **Generation**: Terrain value functions return heights relative to the water level to simplify logic (e.g. `y - waterLevel`).

## Rendering/perf patterns
- Use `InstancedMesh` for large counts (voxels, particle cubes).
- Initialize instance matrices/colors in `useLayoutEffect`.
- **Worker-side Processing**: Offload expensive calculations (e.g., `computeBoundingSphere`) to workers and transfer results to minimize main-thread work.
- **Main-thread Batching**: Limit per-frame main-thread work (e.g., applying mesh results) via `maxMeshesPerFrame` to prevent frame spikes.
- **Debounced Scheduling**: Debounce expensive global operations (e.g., `reprioritizeDirty()`) during continuous input/movement.
- When using `vertexColors` with instanced voxels, ensure the base geometry has
  a `color` attribute (`ensureGeometryHasVertexColors()` in
  `src/render/instanced.ts`) to avoid black materials.
- Minimize work inside `useFrame()`; prefer cached `Vector3`/`Object3D`/`Matrix4`
  in refs/memos.

## Interaction patterns
- Pointer lock is requested on body clicks; UI modals stop propagation so clicks
  don’t re-lock.
- UI overlay uses `pointer-events-none` at the container level and enables interaction per panel.
