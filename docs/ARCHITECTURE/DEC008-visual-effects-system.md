# DEC008: Visual Effects System

**Status:** Implemented
**Date:** 2026-01-01

## Context

The game requires visual feedback ("juice") for gameplay events such as mining blocks and depositing resources. These events originate in the threaded simulation (`sim.worker.ts`) but must trigger visual effects (particles, UI overlays) on the main thread.

## Decision

We implement a **Event-Driven Visuals** pattern using the existing `RenderDelta` protocol.

### 1. Event Sources (Simulation)
The simulation detects gameplay events (e.g., a block being broken, a drone depositing cargo). Instead of handling visuals, it simply pushes lightweight event data into the frame delta.

- **Data Structure:**
  - `minedPositions`: Flat array of `[x, y, z]` coordinates for mined blocks.
  - `depositEvents`: Array of `{ x, y, z, amount }` objects for resource drops.

### 2. Protocol (Transport)
These events are defined in `RenderDelta` (`protocol.ts`) and strictly validated via Zod schemas (`schemas.ts`). This ensures type safety across the worker boundary.

### 3. Render Systems (Main Thread)
Specialized React components consume these events from the `delta` each frame.

#### Particle System (`Particles.tsx`)
- **Technology:** `THREE.InstancedMesh`.
- **Implementation:**
  - Manages a fixed pool of particles.
  - On `minedPositions` data, spawns a burst of particles at the target coordinates.
  - Handles physics (gravity, velocity) and lifecycle (fading) entirely in `useFrame` on the GPU/CPU boundary (updating instance matrices).

#### Floating Text System (`FloatingTextSystem.tsx`)
- **Technology:** `@react-three/drei/Html`.
- **Implementation:**
  - Manages a list of active text instances (React state).
  - On `depositEvents`, spawns a new text element overlay.
  - Uses CSS transforms/React state to float text upwards and fade out.
  - **Trade-off:** HTML overlays are performance-heavy compared to InstancedMesh, but offer superior text rendering quality and CSS styling flexibility. Suitable for "low frequency" events like deposits (vs "high frequency" mining particles).

## Consequences

### Pros
- **Decoupling:** Simulation knows nothing about rendering, only that "an event happened".
- **Performance:** High-frequency effects (mining) use optimized InstancedMesh. Low-frequency effects (text) use flexible HTML.
- **Maintainability:** Adding new effects is as simple as adding a new event array to `RenderDelta` and a new consumer component.

### Cons
- **Bandwidth:** Sending arrays of events every frame increases message size, though typically negligible for these gameplay events.
- **Latency:** Visuals are strictly tied to the `RenderDelta` update rate (simulation tick rate), which might decouple from smooth render framerate if not interpolated. Currently, for instantaneous visual bursts, this is acceptable.
