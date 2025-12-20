# NanoBotsIdle Copilot instructions

## Project map (read these first)
- Entry point: `src/main.tsx` renders `src/ui/App.tsx`.
- Rendering + game loop: `src/game/GameCanvas.tsx` (R3F `<Canvas/>`) and `src/game/GameScene.tsx` (`useFrame` tick).
- Core voxel engine: `src/voxel/World.ts` (chunks + terrain), `src/voxel/meshing.ts` (face-culling mesher), `src/voxel/rendering.ts` (chunk mesh sync), `src/voxel/picking.ts` (3D DDA raycast), `src/voxel/PlayerController.ts` (pointer-lock FPS controller).
- UI: `src/ui/components/*` backed by Zustand store `src/game/store.ts`.

## How the runtime is wired
- `GameScene` owns the long-lived `World` instance via `useMemo` (not in Zustand). Each frame it:
  - streams chunks: `world.ensureChunksAround()` + `world.pruneFarChunks()`
  - rebuilds geometry: `world.rebuildDirtyChunks()` (bounded work)
  - swaps meshes: `createChunkMeshes(...).sync()` (bounded work)
  - updates player physics: `player.update(dt)`
  - updates UI stats + target block via `useGameStore` setters.

## State & UI conventions (Zustand)
- Use `useGameStore(selector)` in UI components; avoid subscribing to the entire store.
- Store is for UI + lightweight game state only (inventory/hotbar/stats/target/pointer lock). Keep heavy objects (`World`, `THREE.*`, geometries) out of Zustand.
- Pointer lock flow: `GameScene` sets `requestPointerLock` in store; `Hud` uses it and toggles inventory with `E` (`document.exitPointerLock()` when UI opens).

## World/chunk invariants (easy to break)
- `BlockId` enum values MUST match indices in `BLOCKS` (`src/voxel/World.ts`).
- If you add a new block, update all of:
  - `BLOCKS` + `BlockId` in `src/voxel/World.ts`
  - hotbar / seeded inventory in `src/game/store.ts`
  - `INVENTORY_BLOCKS` + `tileForBlockIcon` behavior in `src/game/items.ts`
  - atlas tile painting in `src/voxel/atlas.ts` (tile IDs are hardcoded)
  - optionally crafting in `src/game/recipes.ts`.
- When changing a block in-world, always call both:
  - `world.setBlock(...)`
  - `world.markDirtyAt(...)` (handles neighbor chunk rebuild when editing edges).

## Performance guardrails (keep these limits)
- Chunk rebuild work is capped per frame in `World.rebuildDirtyChunks()` (`maxPerFrame = 4`).
- Mesh swaps are capped per frame in `src/voxel/rendering.ts` (`maxPerFrame = 6`).
- `GameCanvas` intentionally uses `gl={{ antialias: false, powerPreference: "high-performance" }}` and `dpr={[1,2]}`.

## Dev workflows
- Vite dev server: `npm run dev` (fixed port `5173`, see `vite.config.ts`).
- Production build: `npm run build` (TypeScript project build + Vite).
- Preview build: `npm run preview`.

## Texture/atlas conventions
- The block atlas is generated at runtime: `createAtlasTexture()` in `src/voxel/atlas.ts`.
- UI icons use the same atlas via `atlasUrl` (data URL) + `iconStyle()` in `src/ui/utils.ts`.
- Keep `tilesPerRow = 16` consistent between `atlas.ts`, `meshing.ts`, and `ui/utils.ts`.
