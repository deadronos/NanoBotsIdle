# AI agents: how to work effectively in this repo

Read these first:


- Repo-wide coding context: `.github/copilot-instructions.md` (#file:copilot-instructions.md)
- Spec workflow: `.github/instructions/spec-driven-workflow-v1.instructions.md` (#file:spec-driven-workflow-v1.instructions.md)
- Memory Bank rules + structure: `.github/instructions/memory-bank.instructions.md` (#file:memory-bank.instructions.md)

This repo is a browser-based voxel sandbox built with React 19 + React Three Fiber (Three.js) + Zustand.
The project has a few easy-to-break invariants (block IDs, chunk rebuild boundaries, atlas tile IDs). This file exists to keep agents from “fixing” the game into a broken or slow state.

## Where to start (code navigation)


- App entry: `src/main.tsx` → `src/ui/App.tsx`
- Rendering root: `src/game/GameCanvas.tsx` (R3F `<Canvas/>` + sky)
- Game loop + world ownership: `src/game/GameScene.tsx` (`useFrame` tick)
- Voxel engine:
  - World + terrain + chunks: `src/voxel/World.ts`
  - Meshing (face culling): `src/voxel/meshing.ts`
  - Mesh sync / disposal: `src/voxel/rendering.ts`
  - Picking (3D DDA raycast): `src/voxel/picking.ts`
  - Player physics + pointer lock: `src/voxel/PlayerController.ts`
- UI + state:
  - Zustand store: `src/game/store.ts`
  - HUD + overlays: `src/ui/components/*`

## Runtime architecture (what talks to what)


- `GameScene` creates a long-lived `World` instance via `useMemo` and keeps it out of Zustand.
- Each frame (`useFrame`) the scene:
  1. Streams chunks in/out: `world.ensureChunksAround(...)` and `world.pruneFarChunks(...)`
  2. Rebuilds dirty chunk CPU geometry: `world.rebuildDirtyChunks()`
  3. Swaps GPU meshes incrementally: `createChunkMeshes(...).sync()`
  4. Updates player physics: `player.update(dt)`
  5. Pushes lightweight stats + target block into Zustand for the UI

This separation is intentional:

- Zustand is UI/light state only.
- Heavy objects (`World`, chunk buffers, `THREE.*`, geometries, materials) stay in `GameScene` and refs.

## Developer workflows (local)


- Dev server: `npm run dev` (fixed port 5173 via `vite.config.ts`)
- Production build: `npm run build` (TypeScript build + Vite)
- Preview build: `npm run preview`

There is currently no test runner configured in `package.json`.

## Non-negotiable invariants (common foot-guns)

### Block IDs must align everywhere

In `src/voxel/World.ts`:

- `BlockId` enum numeric values MUST match indices in `BLOCKS`.

If you add/remove/reorder blocks, you typically must update:

- `src/voxel/World.ts`: `BLOCKS`, `BlockId`, and anything keyed by those IDs
- `src/game/store.ts`: `seededInventory`, `defaultHotbar`
- `src/game/items.ts`: `INVENTORY_BLOCKS`, `tileForBlockIcon`, `isPlaceableBlock`
- `src/voxel/atlas.ts`: tile painting (tile IDs are hardcoded)
- `src/game/recipes.ts`: crafting recipes (if relevant)

### World edits must mark chunks dirty

When changing the world in response to player actions or tools, do BOTH:

- `world.setBlock(...)`
- `world.markDirtyAt(...)` (ensures neighbor chunk rebuild when editing at chunk edges)

### Performance guardrails exist on purpose

These caps keep the game smooth:

- `World.rebuildDirtyChunks()` caps rebuilds per frame (`maxPerFrame = 4`)
- `createChunkMeshes(...).sync()` caps mesh swaps per frame (`maxPerFrame = 6`)

Avoid “optimize by rebuilding everything” changes; preserve bounded-per-frame work.

### Atlas contract is shared by voxel + UI

The texture atlas is generated at runtime:

- `createAtlasTexture()` in `src/voxel/atlas.ts`
- Mesh UVs assume `tilesPerRow = 16` in `src/voxel/meshing.ts`
- UI icons assume the same tile layout in `src/ui/utils.ts`

Keep `tilesPerRow` consistent across those files.

## Input / pointer-lock flow (UI + player)


- `PlayerController` binds keyboard/mouse look; pointer lock is requested on the canvas element.
- `GameScene` sets `requestPointerLock` into Zustand so UI can trigger it.
- `src/ui/components/Hud.tsx` toggles inventory on `E`:
  - opening UI calls `document.exitPointerLock()`
  - closing UI calls `requestPointerLock?.()`

## Spec-driven workflow + Memory Bank (required for non-trivial work)

Follow the spec loop described in #file:spec-driven-workflow-v1.instructions.md.

All long-lived project memory lives in `/memory` (present in this repo):

- `/memory/designs/` for design docs
- `/memory/tasks/` for task tracking

When starting a non-trivial change:

- Create/update a task file under `/memory/tasks/` and list it in `/memory/tasks/_index.md`.
- Keep the task updated as you implement.

## “If in doubt, do TDD” rule

When behavior is unclear or you’re changing logic that could regress:

1. Write a **meaningful failing test first** (captures the intended behavior).
2. Make the test pass with the smallest correct change.
3. Refine/clean up while tests keep passing.

Notes for this repo:

- Prefer tests around pure logic (world math, chunk indexing, crafting/inventory rules, raycast edge cases).
- Avoid brittle rendering tests unless necessary (Three/R3F can be harder to test).
- If you add a test runner, document it in `README.md` and keep tests fast.

## What to avoid


- Don’t move `World` into Zustand (it breaks the intended state separation and can cause perf/regression issues).
- Don’t remove the per-frame rebuild/swap caps unless you replace them with an equivalent bounded strategy.
- Don’t reorder `BLOCKS`/`BlockId` without updating all dependent lists and atlas tiles.
