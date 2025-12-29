## TECH001: Sim/Render Separation (Main Thread + Worker)

**Status:** Draft (intended target architecture)  
**Last updated:** 2025-12-29

## Summary

Simulation runs as a pure TypeScript engine (no React, no R3F/Three, no Zustand)
and is hosted in a Web Worker. Rendering and player input/collision remain on
the main thread.

The Worker owns canonical simulation state. The main thread owns canonical
render state (Three objects) and player input/collision state.

## Goals

- Keep the main thread responsive for input + rendering.
- Make simulation deterministic and testable in isolation.
- Use explicit message types to avoid hidden coupling.
- Avoid per-frame allocations and message backlogs.

## Rules / guardrails

- Do not import `three` in engine/worker/protocol code.
- Do not import Zustand in engine/worker/protocol or renderer code.
- The main thread must not mutate sim state directly.
- The Worker must not touch DOM/WebGL/Three APIs.
- The main thread must not post `STEP` messages faster than the Worker can
  respond (tick gating; prevents message backlog).

## Data flow

1. Main thread gathers input/UI actions into a command queue.
2. Each animation frame, main thread sends a single `STEP` message containing:
   - the queued commands
   - timing/budget controls (`nowMs`, `budgetMs`, `maxSubsteps`)
3. Worker applies commands, advances sim under a budget, and replies with:
   - voxel edits (authoritative)
   - render deltas (entity poses, dirty chunks, effects)
   - UI snapshot (derived numbers)

## Protocol (TypeScript shape)

This is the intended message shape. Payloads should use plain objects and typed
arrays only (structured clone / transferables).

```ts
export type Cmd =
  | { t: "BUY_UPGRADE"; id: string; n: number }
  | { t: "CLICK_VOXEL"; x: number; y: number; z: number }
  | { t: "SET_TOOL"; tool: "mine" | "build" };

export type VoxelEdit = {
  x: number;
  y: number;
  z: number;
  mat: number; // material id enum (no Three Color)
};

export type RenderDelta = {
  tick: number;
  // Entities the renderer cares about (drones for now).
  entities?: Float32Array; // packed xyz xyz ... (transferable when needed)
  // Voxels changed this step (also used for collision proxy on main thread).
  edits?: VoxelEdit[];
  // Chunk ids to rebuild meshes for (optional; derived from edits).
  dirtyChunks?: Int32Array;
  // Short-lived effects for visuals only.
  effects?: Array<{ kind: "beam"; fromId: number; toX: number; toY: number; toZ: number; ttl: number }>;
};

export type UiSnapshot = {
  credits: number;
  prestigeLevel: number;
  droneCount: number;
  upgrades: Record<string, number>;
  // Optional: next-cost precomputes so UI never re-implements balance math.
  nextCosts?: Record<string, number>;
};

export type ToWorker =
  | { t: "INIT"; seed?: number }
  | { t: "STEP"; frameId: number; nowMs: number; budgetMs: number; maxSubsteps: number; cmds: Cmd[] };

export type FromWorker =
  | { t: "READY" }
  | { t: "FRAME"; frameId: number; delta: RenderDelta; ui: UiSnapshot; stats?: { simMs: number; backlog: number } }
  | { t: "ERROR"; message: string };
```

## Tick scheduling (no backlog rule)

Main thread should gate the tick loop:

- Keep at most one `STEP` in flight.
- Send the next `STEP` only after receiving the previous `FRAME`.

This avoids message queues growing under load (which would otherwise increase
input latency and create "rubber band" simulation updates).

## Engine API shape (pure TS)

The Worker is a thin transport adapter around a pure engine module:

```ts
export type Engine = {
  dispatch(cmd: Cmd): void;
  tick(dtSeconds: number, budgetMs: number, maxSubsteps: number): {
    delta: RenderDelta;
    ui: UiSnapshot;
    backlog: number;
  };
};

export function createEngine(seed?: number): Engine;
```

## Notes for future expansion

- If voxel mesh generation becomes expensive, move meshing to a separate Worker
  (or a worker pool) and feed results back to the main thread renderer.
- Prefer transferables for large payloads and reuse buffers to avoid GC spikes.
