# System Patterns

## High-level architecture

The game is structured as a **render loop + voxel engine + UI state**:

- React UI mounts the game canvas and HUD (`src/ui/App.tsx`).
- `GameCanvas` hosts the R3F `<Canvas/>` and sky dome (`src/game/GameCanvas.tsx`).
- `GameScene` owns the long-lived `World` instance and performs per-frame updates (`src/game/GameScene.tsx`).
- The voxel engine lives in `src/voxel/*` (world storage, meshing, rendering sync, picking, player controller).
- Zustand (`src/game/store.ts`) stores UI/light state only (inventory, hotbar, stats, target block, pointer lock).

## Per-frame data flow

`GameScene` runs the loop (via `useFrame`) and does work in this order:

1. Chunk streaming: `world.ensureChunksAround(...)` + `world.pruneFarChunks(...)`
2. CPU rebuild: `world.rebuildDirtyChunks()` (bounded)
3. GPU sync: `createChunkMeshes(...).sync()` (bounded)
4. Player update: `player.update(dt)`
5. UI updates: push stats and target block to Zustand

## Separation of concerns

- Heavy objects (`World`, `THREE.Material`, geometries, meshes) stay in `GameScene` refs.
- Zustand is treated as a bridge to the HUD and overlays.

## World/chunk modeling

- Chunks are keyed by `"cx,cz"` and store blocks in a `Uint8Array`.
- Storage layout is x-major: `idx = x + sx * (z + sz * y)`.
- Terrain is generated per chunk on creation; neighbors are marked dirty to hide/show seam faces.

## Rendering model

- Meshing is face-culling only (not greedy): `src/voxel/meshing.ts`.
- Mesh objects are created per chunk key; geometry is swapped in bounded batches: `src/voxel/rendering.ts`.

## Input / pointer-lock pattern

- `PlayerController` handles keyboard + mouse look and requests pointer lock for `gl.domElement`.
- `GameScene` publishes `requestPointerLock` into Zustand.
- `Hud` toggles inventory with `E`:
  - when UI opens: `document.exitPointerLock()`
  - when UI closes: `requestPointerLock?.()`
