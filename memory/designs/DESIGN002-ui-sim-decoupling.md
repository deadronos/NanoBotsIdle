# DESIGN002 - UI refresh + fixed-step simulation decoupling

## Summary

Refresh the HUD/inventory UI with shadcn components and Tailwind, and decouple simulation from render timing using a fixed 60 Hz step with interpolation, while preserving voxel/world invariants and per-frame rebuild caps.

## Goals

- Replace most HUD/inventory UI with shadcn components (Button, Card, etc).
- Maintain pointer-lock UX and hotbar behavior.
- Run player/world simulation on a fixed 1/60s step independent of render FPS.
- Interpolate render state from simulation snapshots to reduce jitter.
- Document ECS (miniplex) and Immer guidance without moving the voxel World into ECS.

## Non-goals

- Rewriting voxel chunk system or meshing pipeline.
- Introducing multiplayer or persistence in this change.
- Moving `World` or `THREE.*` objects into Zustand or ECS.

## Architecture

### Rendering vs Simulation

- **Simulation**: fixed-step (1/60s) for player movement, time-of-day, and other deterministic updates.
- **Render**: per-frame R3F `useFrame` loop handles chunk streaming, dirty chunk rebuilds, and mesh swaps with existing caps.
- **Interpolation**: render loop interpolates player camera position between the previous and current simulation steps.

### Data flow (high level)

```
useFrame(delta)
  accumulator += delta
  while accumulator >= fixedStep and steps < maxSteps:
    player.step(fixedStep)
    simTime += fixedStep
    accumulator -= fixedStep
  alpha = accumulator / fixedStep
  player.syncCamera(alpha)
  world.ensureChunksAround(player.position)
  world.pruneFarChunks(player.position)
  world.rebuildDirtyChunks()
  chunkMeshes.sync()
  update stats + lighting using simTime
```

## UI approach

- Add Tailwind + shadcn primitives under `src/ui/components/ui`.
- Replace panel layouts with `Card` and buttons with `Button` variants.
- Keep crosshair/hotbar visuals as CSS for now; migrate other panels to Tailwind.
- Use CSS variables and Tailwind utilities to preserve the current visual theme.
- Add shadcn Tabs + ScrollArea in inventory to separate inventory vs crafting views.

## ECS evaluation notes

- Miniplex can manage entity data (player, mobs, items) and system execution.
- The voxel `World` and GPU resources should remain outside ECS storage.
- Consider ECS only after fixed-step loop is stable; avoid large refactors now.
- PoC should store player/time snapshots as plain data and update them per fixed-step tick.

## Risks

- Tailwind config or shadcn styles could conflict with existing CSS or pointer-lock overlay behavior.
- Fixed-step loop must clamp catch-up steps to avoid spiral-of-death on low FPS.

## Open questions

- Should chunk streaming remain on render tick (preferred) or move to fixed-step?
- Should inventory/crafting UI be split into tabs or keep a single scroll view?
