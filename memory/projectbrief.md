# Project Brief

## Overview

NanoBots Idle ("Voxel Frontier") is a browser-based, single-player voxel sandbox built with React + React Three Fiber (Three.js). It generates a Minecraft-style world with chunk streaming, face-culled meshing, pointer-lock FPS controls, and a small inventory/crafting UI.

## Goals

- Run a smooth voxel world **entirely in the browser** (no backend).
- Stream an effectively infinite world using **chunk generation + pruning**.
- Keep the frame loop stable using **bounded per-frame work**.
- Avoid external art assets by generating a **runtime texture atlas**.

## Non-goals (current)

- Multiplayer / authoritative server.
- Save/load persistence.
- Complex lighting propagation (beyond basic directional/ambient day-night tuning).

## Key invariants (easy to break)

- `BlockId` enum numeric values MUST match indices in `BLOCKS` (`src/voxel/World.ts`).
- When editing voxels at runtime, call both `world.setBlock(...)` and `world.markDirtyAt(...)`.
- Performance guardrails:
  - `World.rebuildDirtyChunks()` caps rebuilds per frame (`maxPerFrame = 4`).
  - `createChunkMeshes(...).sync()` caps mesh swaps per frame (`maxPerFrame = 6`).
- Atlas contract: `tilesPerRow = 16` must match `src/voxel/atlas.ts`, `src/voxel/meshing.ts`, and `src/ui/utils.ts`.

## Primary entry points

- App entry: `src/main.tsx` → `src/ui/App.tsx`
- Render + loop: `src/game/GameCanvas.tsx` and `src/game/GameScene.tsx`
- Voxel engine: `src/voxel/*`
- UI state: `src/game/store.ts` (Zustand)
