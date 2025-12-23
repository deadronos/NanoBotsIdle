# Handoff

## Context
- Repo: d:/GitHub/NanoBotsIdle
- Focus: performance optimization systems + config centralization

## Current status
- TASK008 (performance optimization plan + reusable systems) is in progress in `memory/tasks/TASK008-performance-optimization-plan.md`.
- DESIGN007 (performance optimization) captured in `memory/designs/DESIGN007-performance-optimization.md`.
- Perf baseline captured in `memory/perf-baselines.md` (Playwright headful required; headless WebGL failed).
- Config centralization under `/src/config` started; TASK009 is marked completed in `memory/tasks/_index.md`, but review for any leftover constants is recommended.

## What was implemented recently
- Perf instrumentation: `src/game/perf.ts` (`window.__nanobotsPerf`) and perf metrics in `GameScene`.
- Frame budget scheduler: `src/game/scheduler.ts` to cap background work per frame.
- Chunk mesh reuse: `src/voxel/meshing.ts` now reuses typed arrays; `src/voxel/rendering.ts` reuses BufferGeometry attributes.
- Chunk streaming now triggers on chunk-boundary changes (not per-frame scans) in `src/game/GameScene.tsx`.
- Instanced rendering for ECS mobs/items: `src/game/instancedBatch.ts`, `src/game/ecs/instancedRender.ts`.
- Config centralization: new `src/config/*` modules (atlas/world/simulation/gameplay/perf/rendering/ecs/player/particles) and multiple call sites updated.
- Baseline capture tooling: Playwright config + test `tests/perf-baseline.spec.ts` with baseline table in memory.

## Key files to review
- `src/game/GameScene.tsx`
- `src/voxel/World.ts`
- `src/voxel/meshing.ts`
- `src/voxel/rendering.ts`
- `src/game/instancedBatch.ts`
- `src/game/ecs/instancedRender.ts`
- `src/game/perf.ts`
- `src/config/*`
- `memory/perf-baselines.md`

## Known issues / gotchas
- Playwright headless WebGL failed; baseline requires headful run. Use `PERF_HEADLESS=false`.
- Perf baseline showed lighting queue dominating frame time; consider further optimizations in light propagation.
- TASK009 is marked complete but may still have hard-coded constants in scattered files; verify before closing.

## Tests run
- `npm run build`

## Next steps for a new agent
1. Recheck config centralization for missed constants; update `memory/tasks/TASK009-config-centralization.md` and `_index.md` if needed.
2. Expand perf instrumentation (queue lengths, rebuild counts, pool hit/miss) and refresh baseline.
3. Consider lighting queue optimizations (ring buffer, chunk-local access, fewer world lookups).
4. Evaluate meshing optimizations (greedy meshing or cached neighbor access) once lighting cost is under control.
5. If main-thread cost remains high, consider worker offload for generation/meshing.

## Baseline capture
- `npm run dev`
- `PERF_HEADLESS=false npm run perf:baseline`
- Append results to `memory/perf-baselines.md`
