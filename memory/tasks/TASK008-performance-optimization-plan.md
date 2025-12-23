# [TASK008] - Performance optimization plan and reusable systems

**Status:** In Progress  
**Added:** 2025-12-23  
**Updated:** 2025-12-23

## Original Request

take a hard look at all current implementation, how can we optimize performance?
instanced rendering or more? caching/resuse/pooling?

aim to suggest systems that can be reusable as components and systems are added

dont code yet, plan

## Thought Process

- Focus on the current hot paths: chunk streaming, meshing, lighting propagation, and per-frame allocations.
- Identify optimizations that are reusable as new systems are added (scheduler, pools, render batches).
- Prioritize changes that reduce CPU time and GC, then draw calls.
- Keep existing invariants intact (chunk rebuild caps, block ID alignment, atlas layout).

## Implementation Plan

1. Establish a baseline by profiling chunk meshing, lighting, and mesh swap costs. Record draw calls and frame time.
2. Design and implement a frame-budget scheduler for background jobs (generation, lighting, mesh swaps).
3. Replace per-frame streaming scans with chunk-boundary-triggered updates.
4. Add geometry and typed-array pooling; update chunk mesh swap to reuse buffers.
5. Optimize meshing (greedy meshing or chunk-local neighbor cache) and measure improvements.
6. Create a reusable instance batching system for items, mobs, and particles.
7. Consider worker offload for chunk generation/meshing if main-thread cost remains high.

## Progress Tracking

**Overall Status:** In Progress - 70%

### Subtasks

| ID | Description | Status | Updated | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Review current hot paths (meshing, lighting, streaming, allocations) | Complete | 2025-12-23 | Focused on `World`, `meshing`, `rendering`, `GameScene` |
| 1.2 | Draft reusable optimization systems (scheduler, pools, batches) | Complete | 2025-12-23 | Documented in DESIGN007 |
| 1.3 | Define phased plan and acceptance targets | Complete | 2025-12-23 | Documented in DESIGN007 |
| 2.1 | Chunk-boundary streaming trigger | Complete | 2025-12-23 | Avoids per-frame streaming scans |
| 2.2 | Reuse mesh buffers and update renderer swaps | Complete | 2025-12-23 | Mesh buffers reused per chunk |
| 2.3 | Reduce per-frame allocations (picking, particles, controller) | Complete | 2025-12-23 | Pooling + vector reuse |
| 2.4 | Perf instrumentation + baseline capture | Complete | 2025-12-23 | Playwright baseline recorded |
| 2.5 | Frame-budget scheduler | Not Started | 2025-12-23 | Pending design integration |
| 2.6 | Instanced batching for entities | Not Started | 2025-12-23 | Pending entity renderers |

## Progress Log

### 2025-12-23

- Audited current performance hot paths and identified main sources of CPU and GC cost.
- Drafted DESIGN007 to capture reusable optimization systems and phased plan.
- Added initial planned requirements for performance optimization.
- Implemented chunk-boundary streaming trigger to avoid per-frame scans.
- Switched chunk meshing to reuse typed-array buffers and updated renderer to reuse geometry.
- Reduced allocation churn in picking, break particles, and player movement.
- Added perf instrumentation + Playwright baseline capture flow (headful required for WebGL here).
- Baseline snapshot written to `.agent_work/perf-baseline.json` (frameMs avg ~106ms, meshBuild avg ~14.6ms, light avg ~89ms).
