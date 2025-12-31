# TASK011 - Multiplayer PoC: Authoritative Server Foundation

**Status:** Pending  
**Added:** 2025-12-31  
**Updated:** 2025-12-31

## Original Request

Following the recommendations in **DEC008-multiplayer-strategy.md**, implement Phase 1 of the multiplayer rollout plan: a minimal proof-of-concept demonstrating authoritative server architecture with 2 players seeing each other's actions.

## Design Reference

See **DEC008-multiplayer-strategy.md** for:
- Full architectural analysis and justification for authoritative server approach
- Protocol extension designs
- Integration considerations with existing Worker-based architecture

## Goals

**Primary Goal**: Validate that the existing Worker-based simulation (DEC002) can be lifted into a Node.js server with minimal refactoring, and that clients can connect and see shared state.

**Success Criteria**:
1. Server runs `engine.ts` simulation in Node.js environment
2. Two browser clients can connect via WebSocket
3. Clients see each other's player positions in real-time
4. Voxel edits from one client appear on the other client
5. Drone positions are synchronized across both clients

## Implementation Plan

### 1. Refactor Engine for Node.js (Browser-Independent)

**Files to modify:**
- `src/engine/engine.ts`
- `src/engine/world/`
- `src/sim/`

**Tasks:**
- [ ] Audit engine code for browser-specific dependencies (check for `window`, `document`, DOM APIs)
- [ ] Extract any browser dependencies into injectable interfaces
- [ ] Create test that validates engine runs in Node.js without errors:
  ```bash
  node --loader ts-node/esm src/engine/engine.ts
  ```
- [ ] Ensure terrain generation (noise, seed) works identically in Node.js and browser

**Expected Changes**: Minimal. Engine is already designed to be pure TypeScript per TECH001.

### 2. Create Server Foundation

**New files:**
- `server/server.ts` - Main WebSocket server entry point
- `server/sessionManager.ts` - Track connected clients and sessions
- `server/gameServer.ts` - Host engine instance and tick loop
- `server/protocol.ts` - Extend existing protocol for multiplayer
- `server/package.json` - Server-specific dependencies

**Tasks:**
- [ ] Set up WebSocket server using `ws` library
- [ ] Implement tick loop (reuse existing Worker tick scheduling pattern)
- [ ] Create session manager to track connected players
- [ ] Implement basic player join/leave handlers
- [ ] Broadcast engine deltas to all connected clients

**Protocol Extensions:**

```typescript
// Extend existing protocol from TECH001
type MultiplayerToServer =
  | { t: "JOIN"; playerId: string; name: string }
  | { t: "PLAYER_INPUT"; playerId: string; forward: boolean; left: boolean; right: boolean; backward: boolean; jump: boolean; lookDeltaX: number; lookDeltaY: number }
  | { t: "MINE_VOXEL"; playerId: string; x: number; y: number; z: number }
  | Cmd; // Existing commands from TECH001

type MultiplayerFromServer =
  | { t: "JOINED"; playerId: string; worldSeed: number; players: PlayerSnapshot[] }
  | { t: "PLAYER_JOINED"; playerId: string; name: string; position: [number, number, number] }
  | { t: "PLAYER_LEFT"; playerId: string }
  | { t: "SYNC"; tick: number; players: PlayerSnapshot[]; delta: RenderDelta; ui: UiSnapshot }
  | FromWorker; // Reuse existing worker messages

type PlayerSnapshot = {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number]; // pitch, yaw
};
```

**Tick Loop Pattern:**

```typescript
// Reuse Worker tick pattern from DEC002
class GameServer {
  private engine: Engine;
  private clients: Map<string, WebSocket>;
  private tickRate = 20; // 20 Hz / 50ms per tick

  startTickLoop() {
    setInterval(() => {
      const nowMs = Date.now();
      const budgetMs = 40; // 40ms budget for 20 Hz tick
      
      // Tick engine (same as Worker)
      const result = this.engine.tick(1/this.tickRate, budgetMs, 1);
      
      // Broadcast deltas to all clients
      const syncMessage = {
        t: "SYNC",
        tick: this.currentTick++,
        players: this.getPlayerSnapshots(),
        delta: result.delta,
        ui: result.ui,
      };
      
      this.broadcast(syncMessage);
    }, 1000 / this.tickRate);
  }
}
```

### 3. Create Client Networking Layer

**New files:**
- `src/client/serverBridge.ts` - WebSocket client (mirrors `simBridge.ts` pattern)
- `src/client/multiplayerState.ts` - Track remote players

**Tasks:**
- [ ] Create WebSocket client that connects to server
- [ ] Replace Worker bridge with server bridge (controlled by config/env var)
- [ ] Send local player inputs to server
- [ ] Apply received player snapshots to scene
- [ ] Apply received voxel edits to local collision proxy and renderer

**Development Mode Toggle:**

```typescript
// src/config/network.ts
export const networkConfig = {
  mode: import.meta.env.VITE_MULTIPLAYER === "true" ? "server" : "local",
  serverUrl: import.meta.env.VITE_SERVER_URL || "ws://localhost:8080",
};

// Usage in App.tsx
const simBridge = networkConfig.mode === "server" 
  ? createServerBridge(networkConfig.serverUrl)
  : createSimBridge(); // Existing Worker-based
```

### 4. Visualize Remote Players

**Files to modify:**
- `src/components/Player.tsx` (or create `src/components/MultiplayerPlayers.tsx`)

**Tasks:**
- [ ] Add `<InstancedMesh>` for remote player capsules/avatars
- [ ] Update positions from server snapshots
- [ ] Add nameplates (floating text labels) above remote players
- [ ] Differentiate local player from remote players visually

**Example Component:**

```tsx
function RemotePlayers({ players }: { players: PlayerSnapshot[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    players.forEach((player, i) => {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(player.position[0], player.position[1], player.position[2]);
      meshRef.current!.setMatrixAt(i, matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [players]);
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 8]}>
      <capsuleGeometry args={[0.3, 1.5]} />
      <meshStandardMaterial color="cyan" />
    </instancedMesh>
  );
}
```

### 5. Testing & Validation

**Manual Testing:**
1. Start server: `npm run server:dev`
2. Start client 1: `VITE_MULTIPLAYER=true npm run dev`
3. Start client 2: `VITE_MULTIPLAYER=true npm run dev -- --port 5174`
4. Open both clients in browsers
5. Verify:
   - Both clients connect successfully
   - Each client sees the other's avatar
   - Movement in one client appears in the other
   - Mining a voxel in one client removes it in the other
   - Drones are synchronized across both clients

**Automated Tests:**
- [ ] Unit test: Server session manager (add/remove players)
- [ ] Unit test: Protocol serialization/deserialization
- [ ] Integration test: Mock WebSocket server, verify client connects and receives deltas
- [ ] Integration test: Two mock clients, verify they see each other's state

## Out of Scope (Future Phases)

- Player authentication
- Lobby/matchmaking system
- Session persistence (save/load)
- Chat or emote system
- Client-side prediction/interpolation
- Anti-cheat validation (basic validation only in PoC)
- Production deployment configuration

## Integration with Existing Architecture

**Leverages:**
- **DEC002**: Worker-authoritative engine pattern maps directly to server-authoritative
- **TECH001**: Protocol design is reusable; just extend message types
- **DEC003**: Procedural base + sparse edits means clients only receive edits, not full world
- **Deterministic terrain**: Clients generate terrain locally from shared seed

**Required Adaptations:**
- Engine must track multiple player states (currently assumes single player)
- Collision detection may need per-player handling
- Economy/upgrades might be per-player or shared (design decision needed)

## Risks & Mitigation

**Risk**: Engine has hidden browser dependencies  
**Mitigation**: Run engine in Node.js test early; fix dependencies before building server

**Risk**: Network latency makes experience feel laggy  
**Mitigation**: Target 20 Hz tick rate; accept 100-200ms latency for PoC (per DEC008 analysis)

**Risk**: Protocol diverges from existing Worker protocol  
**Mitigation**: Reuse Worker message types where possible; only extend, don't replace

## Success Metrics

- Server starts without errors
- Two clients can connect simultaneously
- Round-trip latency < 200ms on localhost
- No visible desync in voxel edits
- No crashes or memory leaks over 5-minute test session

## References

- **DEC008**: Multiplayer strategy and architectural analysis
- **DEC002**: Worker-authoritative engine (template for server authority)
- **TECH001**: Sim/render separation and protocol design
- **DEC003**: Procedural base + sparse edits (bandwidth efficiency)

## Notes

This PoC intentionally keeps scope minimal to validate core technical feasibility. UI polish, production features, and optimization are deferred to Phase 2 and Phase 3 (see DEC008 for phased roadmap).
