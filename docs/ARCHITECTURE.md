# NanoBotsIdle Architecture (Source of Truth)

**Status:** Alpha (prototype; evolves quickly)  
**Last updated:** 2025-12-30

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

## Terrain & Water Generation

- **Coordinate System**: Pure Y-up.
- **Water Level**: Defined in `src/config/terrain.ts` (default: `-12` as of 2025-12-30).
  - Voxels at `y <= waterLevel` are logically "water".
  - This threshold is authoritative across simulation, rendering, and AI.
- **Generation Strategy**:
  - Uses a deterministic 2D procedural noise function to determine surface height $y$ at $(x, z)$. The current implementation in `src/sim/terrain-core.ts` supports multiple providers; the default is now OpenSimplex (config: `open-simplex`) and a tuned default parameter set aimed to match previous distribution characteristics. Previously the repository used a sin/cos-based function; the change improves terrain coherence.
  - Heights are quantized in `getSurfaceHeightCore()` via `Math.floor((rawNoise + surfaceBias) * quantizeScale)`; current tuned defaults are `surfaceBias = 2.0` and `quantizeScale = 3` (as of 2025-12-30) for `open-simplex`.
  - The resulting quantized heights map into material/value/color bands (see `src/sim/terrain-core.ts` and `src/utils.ts`). For example, the grass band is defined as `y < waterLevel + 6`, dark grass `y < waterLevel + 12`, rock `y < waterLevel + 20`, otherwise snow.
  - Mining logic, frontier initialization, and many systems use the quantized surface heights; some systems (player smooth walking) may use a continuous/unquantized height helper (`getSmoothHeight`) for smoother motion.

### Terrain parameters & mappings

- Defaults (source: `src/config/terrain.ts`):
  - `baseSeed: 123`
  - `prestigeSeedDelta: 99`
  - `worldRadius: 30`
  - `chunkSize: 16`
  - `surfaceBias: 2.0`
  - `quantizeScale: 3`
  - `waterLevel: -12`
  - `bedrockY: -50`

- Material/value mapping (implementation details):
  - Quantized height `y` is converted to a voxel value via `getVoxelValueFromHeight(y, waterLevel)` which returns discrete value bands (water, sand, ore/rock bands, etc.).
  - Color mapping is implemented in `getVoxelColor(y, waterLevel)` and depends on offsets from `waterLevel` (see above for bands).

> Note: Historical docs referenced "Perlin" noise. The current codebase supports multiple providers via `terrain.noiseType`; the default is `open-simplex` and `sincos` remains available for parity/tuning. See `docs/ARCHITECTURE/DEC006-noise-and-init-generation.md`.

- **Design constraint**: World generation must avoid prestige soft locks — ensure the combination of `surfaceBias`, `quantizeScale`, and `waterLevel` produces a sufficient number of above-water, mineable blocks for starter drones. Recent sampling with the default params (seed 222) shows a healthy grass/dark-grass presence (~31% combined), but distribution may vary by seed and radius; consider adding automated assertions or generation checks in initialization to enforce minima.

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

## Worker failure handling and reliability

To ensure the engine degrades gracefully when workers error or are terminated:

### Simulation Worker (`createSimBridge`)

- **Retry logic**: When a worker emits an ERROR, the bridge attempts to restart it up to `maxRetries` times (default: 3).
- **Retry delay**: Configurable delay between retry attempts (default: 1000ms).
- **Graceful degradation**: After max retries are exhausted, the worker is disabled and no further steps are attempted.
- **Telemetry**: All worker errors and retry attempts are tracked via `TelemetryCollector`.
- **Developer diagnostics**: Errors are logged to console with attempt counts and error details.

### Meshing Worker (`MeshingScheduler`)

- **Retry logic**: When a meshing job fails with MESH_ERROR, it is automatically retried up to `maxRetries` times (default: 3).
- **Per-chunk retry tracking**: Each chunk has independent retry counts, so failures don't affect other chunks.
- **Stale handling**: If a chunk is dirtied again during retry, the old retry count is reset and a fresh attempt is made with the new revision.
- **Telemetry**: Meshing errors and retries are tracked separately from sim worker errors.
- **Developer diagnostics**: Failed chunks are logged with coordinates, attempt counts, and error messages.

### Configuration options

Both systems support configurable retry behavior via options:

```typescript
// SimBridge
createSimBridge({
  maxRetries: 3,        // Number of retry attempts before giving up
  retryDelayMs: 1000,   // Delay between retry attempts
  onError: (msg) => {}, // Custom error handler
});

// MeshingScheduler
new MeshingScheduler({
  maxRetries: 3,        // Number of retry attempts per chunk
  // ... other options
});
```

### Testing

Worker error handling is validated via:
- `tests/sim-bridge-error-handling.test.ts`: Tests sim worker retry logic, recovery, and telemetry.
- `tests/meshing-error-handling.test.ts`: Tests meshing worker retry logic, per-chunk independence, and recovery.

## Updating this architecture (workflow)

- If a change affects architecture, update:
  - `docs/ARCHITECTURE.md`, and
  - the relevant `TECH/GAME/DEC` documents in `docs/ARCHITECTURE/`
  in the same PR.
- Designs and implementation plans live in:
  - `memory/designs/`
  - `memory/tasks/`
  and should reference the relevant `TECH/GAME/DEC` IDs.
