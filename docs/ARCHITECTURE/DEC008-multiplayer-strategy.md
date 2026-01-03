# DEC008: Multiplayer Authority & Sync Strategy

**Status:** Draft (design exploration for future implementation)  
**Last updated:** 2025-12-31

## Context

NanoBotsIdle currently runs as a single-player experience with a Worker-based simulation engine (see DEC002, TECH001). The game features:

- Procedurally generated voxel worlds with sparse edits (DEC003)
- Autonomous drone agents performing mining operations
- Real-time voxel destruction and credit accumulation
- Prestige/reset mechanics that regenerate worlds

If multiplayer becomes a future goal, making core architectural decisions early can prevent major refactors. The key questions are:

1. **Where does authority live?** (Client-only, authoritative server, or hybrid)
2. **How is state synchronized?** (Delta updates, lockstep simulation, or prediction+reconciliation)
3. **What is the network model?** (Peer-to-peer, client-server, or relay-based)
4. **How do we handle latency and lag?** (Prediction, interpolation, or accept delays)

## Requirements for Multiplayer

Based on the current gameplay and architecture:

### Functional Requirements

- **Shared world state**: Multiple players see the same voxel terrain and edits
- **Visible player actions**: Players see each other moving, mining, and building
- **Drone visibility**: All players see all drones from all players
- **Consistent economy**: Credits, upgrades, and prestige progression must be synchronized
- **Fair mining**: Two players mining the same block should not cause conflicts or duplication

### Non-Functional Requirements

- **Low latency tolerance**: Voxel mining should feel responsive (< 200ms ideal)
- **Scalability target**: 2-8 concurrent players (small co-op sessions)
- **Bandwidth efficiency**: Minimize data transfer for voxel edits and drone positions
- **Cheat resistance**: Prevent players from giving themselves unlimited credits or resources
- **Session persistence**: Support save/load across multiplayer sessions

### Constraints

- **Existing architecture**: Worker-based sim/render separation (DEC002)
- **Voxel model**: Procedural base + sparse edits (DEC003)
- **Deterministic terrain**: World generation is seeded and reproducible
- **Web platform**: Browser-based, limited to WebRTC or WebSocket transports

## Option 1: Authoritative Server

### Description

A dedicated server hosts the canonical simulation engine. All clients send inputs (commands) to the server, which processes them, updates the world state, and broadcasts deltas back to clients.

```
┌─────────┐         Commands         ┌─────────┐
│ Client  │ ─────────────────────────> │         │
│         │                            │ Server  │
│         │ <───── State Deltas ────── │ (Auth.) │
└─────────┘                            └─────────┘
     │                                      │
     │                                      │
┌─────────┐         Commands         ┌─────────┤
│ Client  │ ─────────────────────────> │         │
│         │                            │         │
│         │ <───── State Deltas ────── │         │
└─────────┘                            └─────────┘
```

### Implementation Details

**Server Responsibilities:**
- Runs the simulation engine (`src/engine/engine.ts`) in Node.js or Deno
- Maintains canonical voxel world (procedural base + edits map)
- Processes all mining, building, and upgrade commands
- Validates actions against game rules (frontier mining, credit costs)
- Broadcasts state deltas to all connected clients
- Handles player join/leave and session management

**Client Responsibilities:**
- Render received state (voxels, drones, player positions)
- Send input commands (WASD movement, mining clicks, upgrades)
- Optionally: client-side prediction for local player movement
- Apply server-authoritative corrections when they arrive

**Protocol Extensions Required:**

```typescript
// New message types for client→server
type ClientToServer =
  | { t: "JOIN_SESSION"; sessionId: string; playerId: string }
  | { t: "PLAYER_INPUT"; playerId: string; input: PlayerInput }
  | { t: "MINE_VOXEL"; playerId: string; x: number; y: number; z: number }
  | { t: "BUY_UPGRADE"; playerId: string; upgradeId: string; count: number };

// New message types for server→client
type ServerToClient =
  | { t: "SESSION_STATE"; tick: number; players: PlayerState[]; edits: VoxelEdit[]; ui: UiSnapshot }
  | { t: "STATE_DELTA"; tick: number; players?: PlayerState[]; edits?: VoxelEdit[]; drones?: DroneState[] }
  | { t: "PLAYER_JOINED"; playerId: string; name: string }
  | { t: "PLAYER_LEFT"; playerId: string }
  | { t: "ERROR"; message: string };

type PlayerInput = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
};

type PlayerState = {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number]; // pitch, yaw
  velocity: [number, number, number];
};
```

**Sync Strategy:**

1. **Snapshot + Delta Model**: Server sends full state snapshot on join, then streams deltas
2. **Tick-based updates**: Server broadcasts at fixed rate (e.g., 20 Hz / 50ms intervals)
3. **Reliable ordering**: Use TCP/WebSocket to guarantee message delivery and order
4. **Sparse voxel edits**: Only send edited voxels, not entire chunks (leverages DEC003)
5. **Shared seed**: Clients generate procedural terrain locally; server only sends edits

### Tradeoffs

**Advantages:**
- ✅ **Strong cheat resistance**: All validation happens server-side
- ✅ **Consistent state**: Single source of truth prevents desync
- ✅ **Flexible logic**: Server can run complex AI, economy, and anti-griefing rules
- ✅ **Scalable**: Can add more servers for different sessions/regions
- ✅ **Save/load**: Server owns persistence; trivial to implement autosave

**Disadvantages:**
- ❌ **Server infrastructure**: Requires hosting, scaling, and operational costs
- ❌ **Latency**: All actions have round-trip delay (100-200ms typical)
- ❌ **Server complexity**: Requires lobby/matchmaking, player authentication, session management
- ❌ **Single point of failure**: Server downtime affects all players
- ❌ **Bandwidth**: Server must broadcast state to all clients continuously

### Integration Tasks

1. **Refactor engine for server**: Make `engine.ts` runnable in Node.js (remove any browser dependencies)
2. **Implement server loop**: Create WebSocket/HTTP server with tick scheduling
3. **Add player management**: Track connected clients, assign player IDs, handle join/leave
4. **Extend protocol**: Add multiplayer-specific message types (see above)
5. **Client prediction**: (Optional) Add client-side movement prediction to hide latency
6. **Rollback/reconciliation**: (Optional) Handle server corrections for predicted states
7. **Session persistence**: Implement save/load for world state and player progress
8. **Anti-cheat validation**: Validate all client commands server-side (frontier checks, credit costs)

## Option 2: Deterministic Lockstep

### Description

All clients run identical copies of the simulation engine. Each client sends its inputs to all other clients, and all clients advance the simulation together in lockstep, ensuring identical results through determinism.

```
┌─────────┐      Inputs (P1)      ┌─────────┐
│ Client  │ ────────────────────> │ Client  │
│   (P1)  │ <─── Inputs (P2) ──── │   (P2)  │
└─────────┘                        └─────────┘
     │                                  │
     │          Inputs (P1/P2)          │
     └─────────────┬──────────────────┘
                   │
              All clients
           simulate tick N
         with same inputs
```

### Implementation Details

**Client Responsibilities:**
- Run full simulation engine locally
- Collect local player inputs each tick
- Broadcast inputs to all peers (via WebRTC DataChannel or relay server)
- Wait for all peer inputs before advancing to next tick
- Execute deterministic simulation with all inputs
- Render local state (should match all other clients)

**Determinism Requirements:**
- **Fixed timestep**: All clients must use identical delta time (e.g., 1/60s)
- **Input synchronization**: Inputs from all players for tick N must arrive before simulating tick N
- **No floating-point variance**: Avoid platform-specific math differences (use fixed-point or validated libraries)
- **Deterministic RNG**: Seed random number generators identically across clients
- **No I/O during simulation**: All side effects must be pure and reproducible

**Protocol Extensions:**

```typescript
type LockstepMessage =
  | { t: "TICK_INPUT"; playerId: string; tick: number; inputs: PlayerInput }
  | { t: "TICK_ACK"; playerId: string; tick: number }
  | { t: "DESYNC_DETECTED"; playerId: string; tick: number; hash: string };

// Clients must exchange hashes to detect desync
type SimulationChecksum = {
  tick: number;
  worldEditHash: string; // Hash of all voxel edits
  playerPositionHash: string; // Hash of all player positions
  economyHash: string; // Hash of credits/upgrades
};
```

**Sync Strategy:**

1. **Fixed tick rate**: All clients run at fixed simulation rate (e.g., 60 ticks/sec)
2. **Input gathering phase**: Each client collects inputs for tick N
3. **Input broadcast phase**: Clients exchange inputs via P2P or relay
4. **Synchronization barrier**: Wait for inputs from all peers before advancing
5. **Deterministic execution**: All clients simulate tick N with identical inputs
6. **Checksum validation**: Periodically compare state hashes to detect desync
7. **Desync recovery**: If mismatch detected, request full state from designated "host" client

### Tradeoffs

**Advantages:**
- ✅ **No server infrastructure**: Peer-to-peer or simple relay (no game logic on server)
- ✅ **Perfect consistency**: All clients see identical state (when deterministic)
- ✅ **Low bandwidth**: Only send inputs (small), not full state deltas
- ✅ **Replay support**: Recording inputs enables perfect replay/demo files
- ✅ **Offline bots**: AI can run locally with no server

**Disadvantages:**
- ❌ **Latency-sensitive**: All clients must wait for slowest peer each tick
- ❌ **Determinism fragility**: Any non-deterministic code causes desync
- ❌ **Cheat vulnerability**: Clients can modify local simulation (no validation)
- ❌ **Scaling limits**: Waiting for N peers scales poorly (max ~4-8 players)
- ❌ **Desync complexity**: Detecting and recovering from desync is difficult
- ❌ **NAT/firewall issues**: P2P requires WebRTC hole-punching or STUN/TURN servers

### Integration Tasks

1. **Ensure deterministic engine**: Audit all simulation code for non-deterministic behavior
   - Replace `Math.random()` with seeded RNG
   - Use fixed timestep (remove variable `dt`)
   - Avoid floating-point order dependencies (sort operations, stable algorithms)
2. **Implement P2P networking**: Use WebRTC DataChannels for low-latency input exchange
3. **Add input buffering**: Queue inputs from peers and wait for all before advancing
4. **Implement desync detection**: Hash state periodically and compare with peers
5. **Add desync recovery**: Request full state dump from "host" on mismatch
6. **Rollback input prediction**: (Optional) Predict local inputs to hide waiting latency
7. **Lobby/matchmaking**: Use relay server for initial peer discovery (not game logic)

## Option 3: Client-Side Prediction + Server Reconciliation

### Description

Clients run a local simulation for immediate responsiveness (prediction), while an authoritative server validates and corrects any deviations. This is the standard approach for modern action games with low-latency requirements.

```
┌─────────┐     Commands     ┌─────────┐
│ Client  │ ──────────────> │ Server  │
│ (Local  │                  │ (Auth.) │
│  Sim)   │ <── Snapshots ── │         │
└─────────┘                  └─────────┘
     │                            │
     │ 1. Predict locally         │
     │ 2. Send command to server  │
     │ 3. Server validates        │
     │ 4. Server sends correction │
     │ 5. Client reconciles       │
```

### Implementation Details

**Server Responsibilities:**
- Run authoritative simulation (same as Option 1)
- Process client commands and validate against game rules
- Broadcast authoritative state snapshots (periodic) and deltas (continuous)
- Store recent history for reconciliation (e.g., last 1-2 seconds)

**Client Responsibilities:**
- **Predict local actions**: Immediately apply local player inputs to local sim
- **Send commands**: Forward inputs to server with sequence numbers
- **Receive corrections**: Server sends authoritative state with tick/sequence numbers
- **Reconcile**: Rewind to server state, replay unacknowledged inputs, fast-forward
- **Interpolate remote entities**: Smooth remote player/drone positions between snapshots

**Protocol Extensions:**

```typescript
type PredictionCommand = {
  t: "PLAYER_COMMAND";
  playerId: string;
  sequence: number; // Client-assigned monotonic sequence
  tick: number; // Client's local tick
  input: PlayerInput;
};

type AuthoritativeSnapshot = {
  t: "SNAPSHOT";
  serverTick: number;
  lastAckedSequence: number; // Last client command processed
  players: PlayerState[];
  edits: VoxelEdit[];
  drones: DroneState[];
};

type Delta = {
  t: "DELTA";
  serverTick: number;
  edits?: VoxelEdit[];
  players?: Partial<PlayerState>[]; // Only changed fields
  drones?: Partial<DroneState>[];
};
```

**Sync Strategy:**

1. **Immediate local prediction**: Client applies local inputs instantly to local sim
2. **Command queue**: Client queues all unacknowledged commands (with sequence numbers)
3. **Server validation**: Server processes commands in sequence-number order
4. **Authoritative snapshots**: Server sends full or partial snapshots (20-60 Hz)
5. **Reconciliation**: Client rewinds to server state, replays pending inputs
6. **Entity interpolation**: Remote entities are interpolated between server snapshots
7. **Extrapolation**: (Optional) Predict remote entity positions when snapshots are delayed

**Example Reconciliation Flow:**

```typescript
// Client predicts locally
client.applyInput(localInput, sequence: 100); // Instant feedback

// Client sends command to server
client.sendToServer({ t: "PLAYER_COMMAND", sequence: 100, input: localInput });

// Server processes command later (100ms latency)
server.processCommand(player, sequence: 100, input: localInput);

// Server sends authoritative snapshot
server.sendToClient({ t: "SNAPSHOT", lastAckedSequence: 100, players: [...] });

// Client reconciles
client.rewindTo(lastAckedSequence: 100); // Discard sequences 101-110
// Sequences 101-110 are now "pending"
// No replay needed since server confirmed 100 exactly matched prediction
// If mismatch: rewind to server state, replay sequences 101-110
```

### Tradeoffs

**Advantages:**
- ✅ **Low perceived latency**: Local actions feel instant (no round-trip delay)
- ✅ **Cheat resistance**: Server validates all actions
- ✅ **Scalable**: Server can handle many clients (not waiting for slowest peer)
- ✅ **Graceful degradation**: Clients can interpolate during lag spikes
- ✅ **Mixed network conditions**: Different players can have different latencies

**Disadvantages:**
- ❌ **Implementation complexity**: Reconciliation logic is non-trivial
- ❌ **Rollback artifacts**: Mispredictions cause visible "rubber-banding"
- ❌ **Server infrastructure**: Still requires hosted server (like Option 1)
- ❌ **Bandwidth overhead**: Clients receive full snapshots periodically
- ❌ **Floating-point sensitivity**: Subtle differences between client/server sim cause drift

### Integration Tasks

1. **Sequence numbering**: Add sequence numbers to all player commands
2. **Client input history**: Store recent inputs for replay after reconciliation
3. **Server command buffer**: Queue client commands with sequence/tick numbers
4. **Rewind/replay system**: Implement state snapshots and deterministic replay
5. **Entity interpolation**: Add interpolation buffer for remote entities (players, drones)
6. **Delta compression**: Optimize snapshot size (only send changed fields)
7. **Lag compensation**: (Optional) Server-side hit detection with rewind/replay
8. **Extrapolation**: (Optional) Predict remote positions when packets are delayed

## Comparison Matrix

| Criterion | Authoritative Server | Deterministic Lockstep | Client Prediction + Reconciliation |
|-----------|---------------------|------------------------|-----------------------------------|
| **Perceived Latency** | Medium-High (100-200ms) | Low (if no waiting) | Low (<50ms for local actions) |
| **Cheat Resistance** | High (server validates) | Low (clients trust each other) | High (server validates) |
| **Infrastructure Cost** | Medium-High (game servers) | Low (relay/signaling only) | Medium-High (game servers) |
| **Bandwidth Usage** | Medium (deltas only) | Low (inputs only) | Medium-High (snapshots + deltas) |
| **Player Count Scalability** | High (server can handle 10-100+) | Low (lockstep scales to ~4-8) | High (server can handle 10-100+) |
| **Implementation Complexity** | Medium | High (determinism + desync) | High (prediction + reconciliation) |
| **Desync Risk** | None (server is authority) | High (any non-determinism) | None (server corrects) |
| **Offline/LAN Support** | No (requires server) | Yes (P2P or local host) | No (requires server) |
| **Replay Support** | Medium (requires state recording) | High (perfect input replay) | Medium (requires state recording) |

## Recommended Path for NanoBotsIdle

### Recommendation: **Authoritative Server** (Option 1)

**Rationale:**

1. **Matches existing architecture**: The Worker-based sim/render separation (DEC002) already provides a clean boundary. The Worker can be lifted into a Node.js server with minimal refactoring.

2. **Aligns with game design**: NanoBotsIdle features autonomous drones, procedural worlds, and economy/progression. These systems benefit from centralized authority to prevent exploits and ensure fair resource distribution.

3. **Low player count target**: For 2-8 player co-op sessions, authoritative server is appropriate. The latency of mining (100-200ms) is acceptable for the idle/incremental genre.

4. **Sparse voxel edits**: The procedural base + sparse edits model (DEC003) is bandwidth-efficient. Clients only receive voxel edits, not full chunks. Terrain is regenerated locally from shared seed.

5. **Avoids determinism complexity**: Lockstep (Option 2) requires strict determinism, which is fragile in JavaScript (floating-point variance, sort stability, Date.now()). NanoBotsIdle's engine uses noise functions, drone AI, and upgrade calculations that would be difficult to guarantee bit-identical across platforms.

6. **Implementation familiarity**: Authoritative server is the industry-standard pattern for web-based multiplayer games. Extensive libraries and tutorials exist (e.g., Socket.IO, Colyseus, WebSockets).

7. **Future-proof**: Starting with authoritative server enables future features like persistent worlds, server-side events, AI NPCs, and anti-griefing moderation.

**Why not Lockstep?**

- NanoBotsIdle's engine is not currently deterministic (uses `Math.random()`, variable timestep, etc.)
- Ensuring determinism across browsers/platforms is high-effort and fragile
- Player count target (2-8) is feasible with authoritative server
- Lockstep's low bandwidth advantage is less critical given sparse voxel edits

**Why not Client Prediction?**

- Client-side prediction is primarily valuable for low-latency twitch games (FPS, racing, fighting)
- NanoBotsIdle is idle/incremental genre with slower, deliberate actions (mining, upgrades)
- 100-200ms latency for mining is acceptable (not instant combat)
- Reconciliation complexity (rollback, replay, interpolation) is high for marginal benefit
- Can be added later on top of authoritative server if latency becomes a problem

### Phased Rollout Plan

**Phase 1: Server Foundation (Minimal Multiplayer)**
- Refactor `engine.ts` to run in Node.js (remove browser dependencies)
- Create WebSocket server with tick loop (reuse Worker protocol)
- Implement basic player join/leave and session management
- Broadcast shared world edits and drone positions
- **Goal**: Proof-of-concept with 2 players seeing each other's actions

**Phase 2: Client Integration**
- Add client-side networking layer (replace Worker with WebSocket)
- Extend UI to show connected players
- Implement player nameplates and visual indicators
- Add chat or emote system for coordination
- **Goal**: Playable co-op experience

**Phase 3: Polish & Features**
- Add client-side smoothing for remote player positions (interpolation)
- Implement lobby/matchmaking system
- Add session persistence (save/load shared worlds)
- Implement anti-griefing measures (rate limits, admin controls)
- **Goal**: Production-ready multiplayer

**Phase 4: (Optional) Prediction Layer**
- If latency becomes a user complaint, add client-side prediction for local player
- Implement reconciliation for server corrections
- This is a pure client-side enhancement; no server changes required
- **Goal**: Reduce perceived latency below 50ms for local actions

## Integration Considerations

### Leveraging Existing Architecture

The current architecture (DEC002, TECH001) is well-suited for multiplayer:

**Advantages:**
- **Worker/server symmetry**: The Worker boundary is similar to a network boundary. Lifting the Worker into a server is straightforward.
- **Message protocol**: The existing `ToWorker`/`FromWorker` protocol can be extended for multiplayer with minimal changes.
- **Sparse edits**: The procedural base + sparse edits model (DEC003) minimizes data transfer. Clients generate terrain locally; server only sends edits.
- **Deterministic terrain**: Shared seed ensures all clients generate identical base terrain without transmission.
- **Render-agnostic sim**: The engine is pure TypeScript with no Three.js/React dependencies, making it portable to Node.js.

**Required Adaptations:**

1. **Multi-player state**: Extend engine to track multiple `PlayerState` objects (positions, rotations, inventories)
2. **Per-player drones**: Associate drones with owning player, or implement shared/contested resource model
3. **Economy model**: Decide if credits are per-player or shared pool
4. **Prestige coordination**: Decide if prestige resets the world for all players (vote? timer? per-player instancing?)
5. **Collision**: Player-to-player collision or no-clip?

### Security & Anti-Cheat

**Server Validation Required:**
- Verify all mining actions against frontier rules (DEC003: "voxel has air neighbor")
- Validate upgrade purchases against credit balance and cost formulas
- Rate-limit commands to prevent spam/DOS
- Check player-to-voxel distance before allowing mining (prevent teleport exploits)

**Client Trust Boundaries:**
- **Never trust**: Credit counts, upgrade levels, drone counts, voxel edit requests
- **Soft trust**: Player positions (validate distance moved per tick, but allow some variance)
- **Fully trust**: Camera angles, UI state, render settings (client-side only, no gameplay impact)

### Performance & Scalability

**Server Scaling:**
- **Vertical scaling**: Single server can handle 10-20 concurrent sessions (80-160 players) on modern VPS
- **Horizontal scaling**: Use session-based sharding (each world is a separate server instance)
- **Database**: Store world state (edits, player progress) in Redis/PostgreSQL for persistence

**Bandwidth Estimation:**
- **Voxel edits**: ~20 bytes per edit (x, y, z, material). If 10 edits/sec across 8 players = 1.6 KB/sec
- **Player positions**: ~40 bytes per player per update. At 20 Hz for 8 players = 6.4 KB/sec
- **Drone positions**: ~40 bytes per drone. If 50 drones at 10 Hz = 20 KB/sec
- **Total per client**: ~30 KB/sec (240 Kbps) — well within broadband limits

**Latency Targets:**
- **Acceptable**: 100-200ms for mining actions (idle game tolerance)
- **Good**: 50-100ms for player movement (feels responsive)
- **Excellent**: <50ms for local prediction (requires Option 3)

### Open Questions & Future Design

1. **Economy model**: Should credits be per-player or shared? Shared encourages cooperation but needs balance tuning.
2. **Drone ownership**: Are drones owned by individual players or shared by the team?
3. **Prestige coordination**: How does prestige work in multiplayer? Vote to reset? Timer? Per-player instances?
4. **PvP elements**: Should players compete for resources, or is it purely cooperative?
5. **Session persistence**: How long do worlds persist? Dedicated servers? Session-based?
6. **Moderation**: How to handle griefing (e.g., player destroying teammate's structures)?

## References

- **DEC002**: Worker-authoritative engine
- **TECH001**: Sim/render separation and protocol
- **DEC003**: Procedural base + sparse edits voxel model
- **TECH002**: Voxel world model (frontier mining, bedrock)
- **GAME001**: Progression loop and soft-lock prevention

## External Resources

- [Gaffer on Games: Networked Physics](https://gafferongames.com/post/networked_physics_2004/)
- [Gabriel Gambetta: Fast-Paced Multiplayer](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- [Valve: Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [Glenn Fiedler: Networking for Game Programmers](https://gafferongames.com/categories/networked-physics/)
- [Colyseus: WebSocket-based Multiplayer Framework](https://colyseus.io/)

## Conclusion

For NanoBotsIdle, **Option 1 (Authoritative Server)** is the recommended path forward. It aligns with the existing architecture, provides strong cheat resistance, and is appropriate for the 2-8 player cooperative target. The Worker-based simulation (DEC002) can be lifted into a Node.js server with minimal refactoring, and the procedural terrain model (DEC003) provides natural bandwidth efficiency.

If multiplayer is greenlit, the phased rollout plan above provides a low-risk path from proof-of-concept to production-ready. Client-side prediction (Option 3) can be added later as a pure client enhancement if latency becomes a concern.
