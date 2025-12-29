# NanoBotsIdle Architecture (Source of Truth)

**Status:** Alpha (prototype; evolves quickly)  
**Last updated:** 2025-12-29

This document is the source of truth for NanoBotsIdle's high-level architecture
and design intent. If the code and this doc diverge, either:

- Update this doc and the relevant specs under `docs/ARCHITECTURE/`, or
- Change the code to match the intended architecture described here.

The previous architecture notes are preserved in `docs/ARCHITECTURE_LEGACY.md`.

## Read next

- Detailed spec index: `docs/ARCHITECTURE/README.md`
- Sim/render split + Worker protocol: `docs/ARCHITECTURE/TECH001-sim-render-separation.md`
- True 3D voxel model: `docs/ARCHITECTURE/TECH002-voxel-world-model.md`
- Progression loop + soft-lock rules: `docs/ARCHITECTURE/GAME001-progression-loop.md`

## Product summary

NanoBotsIdle is a 3D voxel incremental/idle game:

1. Mine blocks (player + drones).
2. Spend credits on upgrades (more drones, faster mining).
3. Prestige regenerates the world for a permanent multiplier.

The architecture must keep the main thread responsive while simulation grows
more complex (voxels, drones, and future systems).

## Architecture goals

- Clean separation of simulation and rendering/UI.
- Main thread stays responsive for player input and R3F rendering.
- Simulation is pure TypeScript and can run in a Worker.
- World supports true 3D digging (not just a surface heightmap).
- Gameplay/balance is configurable via `src/config/*`.
- Systems are modular/extendable (future drones/buildings can be added without
  entangling Three/React into core logic).

## System boundaries (authoritative ownership)

### Main thread (React + R3F)

- Owns:
  - Input + camera/player movement.
  - Collision resolution.
  - Three.js scene objects (meshes, materials, effects).
  - UI rendering and interaction.
- Sends:
  - Commands (player actions + UI actions) to simulation.
- Applies:
  - Voxel edit deltas to render caches and the collision proxy.
  - Entity pose deltas to instanced meshes.

### Simulation (Engine, hosted in a Worker)

- Owns canonical state:
  - Voxel world (procedural base + sparse edits overlay).
  - Drones/entities (target: ~50 drones; soft-capped by costs).
  - Economy/upgrades/prestige.
- Enforces rules:
  - "Mine only if voxel has an air neighbor" (frontier-only mining).
  - Bedrock is indestructible (prevents infinite falling).
  - Starter drones mine above-water only (for now).
  - World generation must avoid prestige soft locks.
- Emits:
  - Voxel edits (authoritative deltas).
  - Render deltas (poses, dirty chunks, short-lived effects).
  - UI snapshot (cheap derived numbers for Zustand/UI).

## Data flow (commands + deltas)

- Main thread collects commands and sends them to the simulation.
- Simulation processes commands during budgeted ticks and returns deltas.
- The main thread drives tick scheduling and gates steps so there is at most one
  step in flight (prevents message backlog and input lag).

Protocol details are specified in `docs/ARCHITECTURE/TECH001-sim-render-separation.md`.

## World model (true 3D digging)

- The world is a 3D voxel field queried as `materialAt(x, y, z)`.
- The base terrain is deterministic from `(x, z, seed)` surface height.
- Edits are stored sparsely as overrides:
  - Mined voxel -> `AIR`
  - Placed voxel -> `SOLID`/material id (future)
- Bedrock is definitive and indestructible:
  - For `y <= bedrockY`, material is always `BEDROCK`
- Mining is frontier-only:
  - A voxel is mineable only if it is solid and has an air neighbor.

Implementation details and constraints are specified in `docs/ARCHITECTURE/TECH002-voxel-world-model.md`.

## Player collision (main thread)

Player collision stays on the main thread for responsiveness. To keep collision
consistent with the authoritative world, the main thread maintains a read-only
collision proxy:

- Procedural base material query (same seed/config rules).
- Mirrored voxel edits applied from Worker deltas.

Decision record: `docs/ARCHITECTURE/DEC001-main-thread-player-collision.md`.

## Rendering (R3F)

- Voxels:
  - Rendered via chunk mesh caches (instancing/meshing strategy can evolve).
  - Voxel edits mark affected chunks dirty and schedule rebuilds.
  - If using `vertexColors` with `InstancedMesh`, ensure the base geometry has a
    `color` attribute (see `ensureGeometryHasVertexColors()` in
    `src/render/instanced.ts`) or colors can appear black.
- Drones:
  - Rendered with instancing; transforms applied imperatively.
  - Per-frame positions must not be stored in Zustand.
- Effects (beams, particles, flashes):
  - Driven by simulation deltas, but implemented as renderer-only systems.

## UI state (Zustand)

Zustand is a read model for UI, not the simulation:

- Stores UI toggles/panels/selection and the latest `UiSnapshot`.
- Must not store world voxel arrays or per-frame render data.

## Config and balancing

- Tuning lives in `src/config/*` and is intended to be tweakable without code
  rewrites.
- Drone count is soft-capped by upgrade cost curves (piecewise knee after a
  threshold; configurable).
- World generation must guarantee a minimum number of above-water mineable
  blocks to avoid prestige soft locks (starter drones are above-water only).

See `docs/ARCHITECTURE/GAME001-progression-loop.md`.

## Updating this architecture (workflow)

- If a change affects architecture, update:
  - `docs/ARCHITECTURE.md`, and
  - the relevant `TECH/GAME/DEC` documents in `docs/ARCHITECTURE/`
  in the same PR.
- Designs and implementation plans live in:
  - `memory/designs/`
  - `memory/tasks/`
  and should reference the relevant `TECH/GAME/DEC` IDs.
