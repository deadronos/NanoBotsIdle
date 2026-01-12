# DESIGN010: Underwater-Capable Drones

**Status:** Draft  
**Related Task:** TBD  
**Date Created:** 2026-01-12  
**Last Updated:** 2026-01-12

## Overview

Expand the drone system to include underwater-capable drones (codename "DIVER"), enabling players to mine resources below the water line. This addresses a key limitation identified in `GAME001-progression-loop.md` where starter drones are restricted to above-water mining.

## Problem Statement

Currently, all drones can only mine surface blocks above water (`y > waterLevel`). This creates artificial boundaries and leaves significant portions of the world inaccessible, limiting:
- Late-game progression opportunities
- Resource variety and value tiers
- Strategic depth in drone fleet composition
- World exploration incentives

## Goals

1. Enable underwater mining without breaking existing balance
2. Create meaningful upgrade choices between drone types
3. Maintain performance targets (~50 total drones)
4. Support future multi-material/ore systems

## Non-Goals

- Full underwater physics simulation
- Separate water rendering/shaders (future enhancement)
- Swimming player mechanics (future enhancement)
- Pressure/depth mechanics beyond simple depth limits

## EARS Requirements

### Ubiquitous Requirements (UR)
- **UR-1**: The system SHALL maintain 60fps with up to 50 drones (25 miners + 25 haulers/divers)
- **UR-2**: All drone types SHALL use the same base AI state machine (IDLE, SEEKING, MOVING, MINING, RETURNING, DEPOSITING)
- **UR-3**: All drone configurations SHALL be defined in `src/config/drones.ts` (not hardcoded)

### Event-Driven Requirements (ED)
- **ED-1**: WHEN a player purchases a "Diver Drone" upgrade, THEN a new DIVER role drone SHALL be spawned
- **ED-2**: WHEN a DIVER drone enters SEEKING state, THEN it SHALL only target voxels where `y <= waterLevel`
- **ED-3**: WHEN a MINER drone enters SEEKING state, THEN it SHALL only target voxels where `y > waterLevel` (existing constraint)
- **ED-4**: WHEN a HAULER targets a DIVER for pickup, THEN it SHALL use the same transfer mechanics as MINER pickups

### Unwanted Behaviors (UB)
- **UB-1**: IF a DIVER targets a voxel above water, THEN the targeting system SHALL reject it and force re-seeking
- **UB-2**: IF underwater resources become more valuable than surface, THEN economy config SHALL be rebalanced
- **UB-3**: IF all drones become DIVERs, THEN the UI SHALL warn that surface mining has stopped

### State-Driven Requirements (SD)
- **SD-1**: WHILE a DIVER is underwater (y < waterLevel), ITS movement speed MAY be reduced by configurable multiplier
- **SD-2**: WHILE mining underwater, visual effects SHALL show bubbles/water particles (if particle budget allows)
- **SD-3**: WHILE DIVERs exist, the HUD SHALL display separate counts for MINER/DIVER/HAULER roles

### Optional Features (OP)
- **OP-1**: IF player prestige level > 5, THEN DIVERs MAY unlock automatic depth bonuses
- **OP-2**: IF future ore types are added, THEN certain ores MAY only spawn underwater
- **OP-3**: IF performance allows, THEN DIVER trails MAY render underwater bubble effects

## Architecture

### Drone Role Extension

```typescript
// src/engine/drones.ts
export type DroneRole = "MINER" | "HAULER" | "DIVER";

// Extend Drone type (no changes needed, role already exists)

// Update syncDroneCount function signature
export const syncDroneCount = (
  drones: Drone[],
  minerCount: number,
  haulerCount: number,
  diverCount: number, // NEW
  cfg: Config,
) => {
  // Logic to sync DIVER drones similar to HAULER
  // DIVERs spawn at underwater positions (y < waterLevel)
};
```

### Configuration Changes

```typescript
// src/config/drones.ts
export type DronesConfig = {
  // ... existing fields
  divers: {
    baseSpeed: number;
    speedPerLevel: number;
    underwaterSpeedMultiplier: number; // 0.7 = 30% slower underwater
    baseCargo: number;
    cargoPerLevel: number;
    maxDepth: number; // How far below waterLevel they can go (-50)
  };
};

export const defaultDronesConfig: DronesConfig = {
  // ... existing
  divers: {
    baseSpeed: 4, // Slower than miners by default
    speedPerLevel: 1.5,
    underwaterSpeedMultiplier: 0.8,
    baseCargo: 15, // More cargo than miners
    cargoPerLevel: 3,
    maxDepth: -50, // Can mine 50 blocks below water
  },
};
```

### Economy Integration

```typescript
// src/config/economy.ts
export type EconomyConfig = {
  baseCosts: {
    drone: number;
    speed: number;
    move: number;
    laser: number;
    hauler: number;
    diver: number; // NEW
  };
  // ...
};

export const defaultEconomyConfig: EconomyConfig = {
  baseCosts: {
    // ... existing
    diver: 750, // More expensive than miners, less than haulers
  },
  // ...
};
```

### Targeting System Updates

```typescript
// src/engine/targeting.ts
export const getRandomTarget = (
  world: WorldModel,
  drone: Drone,
  cfg: Config,
) => {
  // ... existing frontier logic

  // Filter by role
  if (drone.role === "DIVER") {
    // Only underwater targets
    candidates = candidates.filter(([_k, x, y, z]) => y <= cfg.terrain.waterLevel);
  } else if (drone.role === "MINER") {
    // Only above-water targets (existing)
    candidates = candidates.filter(([_k, x, y, z]) => y > cfg.terrain.waterLevel);
  }
  // HAULER doesn't mine, so no filtering

  // ... rest of targeting logic
};
```

### UI Changes

```typescript
// src/components/ui/ShopModal.tsx
// Add new UpgradeCard for DIVER drones
<UpgradeCard
  title="Diver Drone"
  level={snapshot.diverCount}
  cost={nextCosts.diver ?? 0}
  onClick={() => bridge.enqueue({ t: "BUY_UPGRADE", id: "diver", n: 1 })}
  canAfford={snapshot.credits >= (nextCosts.diver ?? Number.POSITIVE_INFINITY)}
  desc="Autonomous underwater mining unit. Can mine resources below the waterline."
/>
```

### Save System Migration

```typescript
// src/shared/protocol.ts - UiSnapshot
export type UiSnapshot = {
  // ... existing fields
  diverCount: number; // NEW
};

// Save migration v2 -> v3
export const migrateV2ToV3 = (v2: SaveV2): SaveV3 => {
  return {
    ...v2,
    version: 3,
    diverCount: v2.diverCount ?? 0, // Default to 0 for old saves
  };
};
```

### Visual Distinctions

```typescript
// src/components/drones/droneInstancedVisuals.ts
const ROLE_COLORS = {
  MINER: 0x00ffcc,   // Cyan (existing)
  HAULER: 0xffaa00,  // Orange (existing)
  DIVER: 0x0066ff,   // Deep blue - underwater theme
};
```

## Testing Strategy

### Unit Tests

```typescript
// tests/drones-diver.test.ts
describe("DIVER drone role", () => {
  test("DIVERs only target underwater voxels", () => {
    // Setup: world with voxels above and below water
    // Assert: DIVER.targetY <= waterLevel
  });

  test("DIVERs spawn at underwater starting positions", () => {
    // Setup: syncDroneCount with diverCount=1
    // Assert: newDiver.y < waterLevel
  });

  test("underwater speed multiplier applies correctly", () => {
    // Setup: DIVER moving underwater vs surface
    // Assert: speed reduced by multiplier when y < waterLevel
  });
});

// tests/targeting-underwater.test.ts
describe("underwater targeting", () => {
  test("getRandomTarget filters by role", () => {
    // Setup: mixed frontier (above/below water)
    // Assert: DIVER gets underwater, MINER gets surface
  });

  test("respects maxDepth configuration", () => {
    // Setup: very deep voxels below maxDepth
    // Assert: DIVER doesn't target too-deep voxels
  });
});

// tests/economy-upgrades.test.ts
describe("DIVER upgrade costs", () => {
  test("buying diver increments diverCount", () => {
    // Assert: state.diverCount increases, credits decrease
  });

  test("diver cost scales exponentially", () => {
    // Assert: cost follows configured curve
  });
});
```

### Integration Tests

```typescript
// tests/diver.integration.test.ts
describe("DIVER end-to-end", () => {
  test("full mining cycle underwater", () => {
    // Setup: DIVER drone, underwater frontier
    // Simulate: SEEKING -> MOVING -> MINING -> RETURNING -> DEPOSITING
    // Assert: credits increase, underwater voxel removed
  });

  test("HAULER can pick up from DIVER", () => {
    // Setup: DIVER with payload, HAULER in range
    // Assert: transfer completes, DIVER returns to SEEKING
  });
});
```

## Performance Considerations

1. **Targeting Performance**: Underwater filtering adds O(n) pass over frontier
   - Mitigation: Maintain separate above/below water frontier sets (future optimization)
   
2. **Visual Effects**: Underwater particle effects could be expensive
   - Mitigation: Reuse existing particle system with blue tint, cap total particles

3. **Pathfinding**: DIVERs don't need special pathfinding (straight-line is fine)
   - No collision detection required for mining drones

## Balance Considerations

### Cost Curve
- **First DIVER**: 750 credits (more than 1st hauler at 500)
- **Scaling**: 1.5x multiplier (same as other drone types)
- **Rationale**: DIVERs access new resources but aren't required for core loop

### Speed/Cargo Trade-offs
- **Speed**: 80% of MINER speed when underwater (configurable)
- **Cargo**: 150% of MINER cargo capacity
- **Rationale**: Slower but more efficient per trip, rewards strategic placement of outposts

### Unlock Progression
- **Availability**: Unlocked from game start (like HAULERs)
- **Viability**: Most useful after 5-10 miners established (player has credits)
- **Late-game**: Essential for deep-world prestige runs

## Migration Notes

### Save Version 2 → 3
- **New field**: `diverCount: number` (default: 0)
- **Backward compatibility**: Old saves load with 0 divers
- **Forward compatibility**: If loaded in old version, diverCount ignored (graceful degradation)

### Testing Migration
```typescript
test("v2 save without diverCount migrates to v3", () => {
  const v2Save = { version: 2, droneCount: 5, haulerCount: 2 };
  const v3Save = migrateV2ToV3(v2Save);
  expect(v3Save.diverCount).toBe(0);
});
```

## Future Enhancements

1. **Depth-based value multiplier**: Deeper voxels worth more credits
2. **Underwater ore types**: Exclusive materials below water
3. **Pressure mechanics**: DIVERs slow down at extreme depths
4. **Submarine outposts**: Special underwater logistics hubs
5. **Hybrid drones**: Amphibious units that can mine anywhere (prestige unlock)

## Implementation Phases

### Phase 1: Core Mechanics (MVP)
- Add DIVER role to type system
- Implement basic underwater targeting filter
- Add DIVER purchase in shop UI
- Write unit tests for targeting and upgrades

### Phase 2: Configuration & Balance
- Add diver config to `src/config/drones.ts`
- Tune speed/cargo/cost parameters
- Integration tests for full mining cycle

### Phase 3: Visuals & Polish
- Blue color tint for DIVERs
- Underwater particle effects (if budget allows)
- HUD updates showing role breakdown
- Save migration system (v2 → v3)

### Phase 4: Testing & Documentation
- Acceptance tests covering all EARS requirements
- Performance profiling with 25 DIVERs + 25 MINERs
- Update ARCHITECTURE.md and GAME001

## Acceptance Criteria

- [ ] DIVER role defined in type system
- [ ] DIVERs only target underwater voxels (ED-2)
- [ ] UI card for purchasing DIVERs in ShopModal
- [ ] Unit tests for underwater targeting (>90% coverage)
- [ ] Integration test for full DIVER mining cycle
- [ ] Config-driven parameters (speed, cargo, cost)
- [ ] Visual distinction (blue color) in renderer
- [ ] Save migration from v2 to v3 with diverCount
- [ ] Performance: 60fps with 50 total drones
- [ ] Documentation updated (this file + GAME001)

## References

- `docs/ARCHITECTURE/GAME001-progression-loop.md` - Out-of-scope list
- `memory/tasks/TASK013-logistics-haulers.md` - Reference implementation
- `src/engine/drones.ts` - Drone type definitions
- `src/config/drones.ts` - Drone configuration
- `src/economy/upgrades.ts` - Upgrade cost calculations
