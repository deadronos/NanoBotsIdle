# DESIGN011: Storage/Outpost Persistence & UI Enhancements

**Status:** Draft  
**Related Task:** TBD  
**Date Created:** 2026-01-12  
**Last Updated:** 2026-01-12

## Overview

Enhance the outpost system with persistent storage capacity, resource management UI, and improved logistics to support multi-material economies and production chains.

## Problem Statement

Current outposts (from DESIGN009/TASK013) serve only as drone docking points with no persistent storage:
- Resources immediately convert to credits on deposit
- No way to stockpile materials for future use
- Cannot support crafting/refining mechanics
- Limited strategic depth in outpost placement
- No visual feedback on stored resources

## Goals

1. Add persistent storage capacity to outposts
2. Create UI for viewing and managing stored resources
3. Support future multi-material systems
4. Maintain backward compatibility with existing saves
5. Enable production/refining chains

## Non-Goals

- Inventory management for player character (drone-focused game)
- Complex logistics routing (A* pathfinding, route optimization)
- Real-time resource market/trading systems
- Multiple storage types per outpost (keep it simple)

## EARS Requirements

### Ubiquitous Requirements (UR)
- **UR-1**: All outpost data SHALL persist in save system across sessions
- **UR-2**: Storage capacity SHALL be configurable per outpost level
- **UR-3**: UI SHALL render at 60fps with up to 20 outposts displayed simultaneously

### Event-Driven Requirements (ED)
- **ED-1**: WHEN a drone deposits at an outpost, THEN resources SHALL be added to outpost storage (not immediately to credits)
- **ED-2**: WHEN outpost storage exceeds capacity, THEN excess SHALL overflow to credits as fallback
- **ED-3**: WHEN player clicks an outpost, THEN a storage UI panel SHALL display with resource breakdown
- **ED-4**: WHEN player upgrades an outpost level, THEN storage capacity SHALL increase by configured multiplier
- **ED-5**: WHEN player clicks "Convert to Credits" button, THEN stored resources SHALL liquidate at configured exchange rates

### Unwanted Behaviors (UB)
- **UB-1**: IF storage data corrupts, THEN system SHALL reset outpost to empty (not crash)
- **UB-2**: IF storage UI is open during world regeneration, THEN UI SHALL close gracefully
- **UB-3**: IF player has 0 outposts, THEN drones SHALL revert to instant credit conversion (legacy behavior)

### State-Driven Requirements (SD)
- **SD-1**: WHILE an outpost is at max capacity, ITS visual indicator SHALL pulse red
- **SD-2**: WHILE storage UI is open, IT SHALL update in real-time as drones deposit
- **SD-3**: WHILE an outpost has stored resources, ITS icon SHALL show fill percentage

### Optional Features (OP)
- **OP-1**: IF player prestige level > 10, THEN outposts MAY auto-upgrade storage capacity
- **OP-2**: IF future building system is added, THEN storage MAY transfer between outposts
- **OP-3**: IF performance allows, THEN outpost models MAY show visual "fullness" (particle effects, glow)

## Architecture

### Data Model

```typescript
// src/engine/world/world.ts
export type OutpostStorage = {
  [materialType: string]: number; // e.g., { "stone": 150, "ore": 45 }
};

export type Outpost = {
  id: string;
  x: number;
  y: number;
  z: number;
  level: number; // Existing
  storage: OutpostStorage; // NEW
  capacity: number; // NEW - derived from level and config
  dockedDrones: Set<number>; // Existing
  queuedDrones: Set<number>; // Existing
};

// Configuration
export type OutpostConfig = {
  baseCapacity: number; // 100 units at level 1
  capacityPerLevel: number; // +50 per level
  maxDockingSlots: number; // 4 (existing)
  upgradeCost: number; // Credits to upgrade level
  upgradeCostMultiplier: number; // 1.5x per level
};

export const defaultOutpostConfig: OutpostConfig = {
  baseCapacity: 100,
  capacityPerLevel: 50,
  maxDockingSlots: 4,
  upgradeCost: 1000,
  upgradeCostMultiplier: 1.5,
};
```

### Storage Logic

```typescript
// src/engine/world/world.ts (WorldModel methods)
export class WorldModel {
  // ... existing methods

  /**
   * Deposit resources into outpost storage.
   * Returns overflow if storage is full.
   */
  depositToOutpost(
    outpostId: string,
    materialType: string,
    amount: number,
  ): { stored: number; overflow: number } {
    const outpost = this.outposts.get(outpostId);
    if (!outpost) return { stored: 0, overflow: amount };

    const current = outpost.storage[materialType] ?? 0;
    const capacity = this.getOutpostCapacity(outpost);
    const totalStored = Object.values(outpost.storage).reduce((a, b) => a + b, 0);
    const available = capacity - totalStored;

    if (available <= 0) {
      return { stored: 0, overflow: amount }; // Full
    }

    const toStore = Math.min(amount, available);
    outpost.storage[materialType] = current + toStore;
    
    return { stored: toStore, overflow: amount - toStore };
  }

  /**
   * Convert stored resources to credits.
   * Uses configured exchange rates.
   */
  liquidateStorage(
    outpostId: string,
    cfg: Config,
  ): number {
    const outpost = this.outposts.get(outpostId);
    if (!outpost) return 0;

    let totalCredits = 0;
    for (const [materialType, amount] of Object.entries(outpost.storage)) {
      const rate = cfg.economy.materialValues[materialType] ?? 1;
      totalCredits += amount * rate;
    }

    outpost.storage = {}; // Clear storage
    return totalCredits;
  }

  getOutpostCapacity(outpost: Outpost): number {
    const cfg = getConfig();
    return cfg.outpost.baseCapacity + (outpost.level - 1) * cfg.outpost.capacityPerLevel;
  }
}
```

### Depositing Behavior Update

```typescript
// src/engine/tickDrones.ts
// In DEPOSITING state handler:

if (drone.state === "DEPOSITING") {
  const outpost = world.getNearestOutpost(drone.x, drone.y, drone.z);
  
  if (outpost) {
    // NEW: Store in outpost instead of instant credits
    const materialType = "generic"; // For now, single material type
    const { stored, overflow } = world.depositToOutpost(
      outpost.id,
      materialType,
      drone.payload,
    );

    // If storage full, overflow goes to credits
    if (overflow > 0) {
      const value = overflow * world.getBlockValue(drone.targetX, drone.targetY, drone.targetZ);
      uiSnapshot.credits += value * uiSnapshot.prestigeLevel;
    }

    drone.payload = 0;
    drone.state = "SEEKING";
    outpost.dockedDrones.delete(drone.id); // Release dock slot
  }
}
```

### UI Components

```typescript
// src/components/ui/OutpostPanel.tsx
export const OutpostPanel: React.FC<{ outpostId: string }> = ({ outpostId }) => {
  const world = useWorldModel(); // Hook to access world state
  const outpost = world.getOutpost(outpostId);
  const cfg = getConfig();

  if (!outpost) return null;

  const capacity = world.getOutpostCapacity(outpost);
  const totalStored = Object.values(outpost.storage).reduce((a, b) => a + b, 0);
  const fillPercentage = (totalStored / capacity) * 100;

  const handleLiquidate = () => {
    const credits = world.liquidateStorage(outpostId, cfg);
    useGameStore.getState().addCredits(credits);
    // Show floating text notification
  };

  const handleUpgrade = () => {
    const cost = cfg.outpost.upgradeCost * Math.pow(cfg.outpost.upgradeCostMultiplier, outpost.level - 1);
    if (useGameStore.getState().credits >= cost) {
      useGameStore.getState().addCredits(-cost);
      outpost.level += 1;
    }
  };

  return (
    <div className="outpost-panel">
      <h3>Outpost #{outpost.id}</h3>
      <div className="storage-bar">
        <div className="fill" style={{ width: `${fillPercentage}%` }} />
        <span>{totalStored} / {capacity}</span>
      </div>
      
      <div className="storage-breakdown">
        {Object.entries(outpost.storage).map(([type, amount]) => (
          <div key={type} className="material-row">
            <span>{type}</span>
            <span>{amount}</span>
          </div>
        ))}
      </div>

      <div className="actions">
        <button onClick={handleLiquidate}>Convert to Credits</button>
        <button onClick={handleUpgrade}>Upgrade (Level {outpost.level})</button>
      </div>
    </div>
  );
};

// src/components/ui/OutpostOverlay.tsx
// Floating UI that shows storage status when near an outpost
export const OutpostOverlay: React.FC = () => {
  const player = usePlayerState();
  const world = useWorldModel();
  
  // Find nearest outpost within 10 units
  const nearbyOutpost = world.getNearestOutpost(player.x, player.y, player.z, 10);
  
  if (!nearbyOutpost) return null;
  
  const totalStored = Object.values(nearbyOutpost.storage).reduce((a, b) => a + b, 0);
  const capacity = world.getOutpostCapacity(nearbyOutpost);
  
  return (
    <div className="outpost-overlay">
      <span>📦 Storage: {totalStored}/{capacity}</span>
    </div>
  );
};
```

### Save System Migration

```typescript
// src/shared/protocol.ts
export type OutpostData = {
  id: string;
  x: number;
  y: number;
  z: number;
  level: number;
  storage: { [materialType: string]: number }; // NEW
};

export type UiSnapshot = {
  // ... existing fields
  outposts: OutpostData[]; // Updated structure
};

// Migration v3 -> v4
export const migrateV3ToV4 = (v3: SaveV3): SaveV4 => {
  return {
    ...v3,
    version: 4,
    outposts: v3.outposts.map(o => ({
      ...o,
      storage: o.storage ?? {}, // Add empty storage for old saves
    })),
  };
};
```

## Testing Strategy

### Unit Tests

```typescript
// tests/outpost-storage.test.ts
describe("Outpost storage", () => {
  test("deposits add to storage correctly", () => {
    const outpost = createOutpost({ level: 1 });
    const { stored, overflow } = world.depositToOutpost(outpost.id, "stone", 50);
    expect(stored).toBe(50);
    expect(overflow).toBe(0);
    expect(outpost.storage.stone).toBe(50);
  });

  test("storage respects capacity limits", () => {
    const outpost = createOutpost({ level: 1, capacity: 100 });
    world.depositToOutpost(outpost.id, "stone", 80);
    const { stored, overflow } = world.depositToOutpost(outpost.id, "ore", 40);
    expect(stored).toBe(20); // Only 20 capacity left
    expect(overflow).toBe(20);
  });

  test("liquidation converts storage to credits", () => {
    const outpost = createOutpost({ level: 1 });
    outpost.storage = { stone: 100, ore: 50 };
    const cfg = getConfig();
    cfg.economy.materialValues = { stone: 1, ore: 2 };
    
    const credits = world.liquidateStorage(outpost.id, cfg);
    expect(credits).toBe(200); // 100*1 + 50*2
    expect(outpost.storage).toEqual({});
  });

  test("capacity increases with level", () => {
    const cfg = getConfig();
    const outpost = createOutpost({ level: 1 });
    const cap1 = world.getOutpostCapacity(outpost);
    
    outpost.level = 2;
    const cap2 = world.getOutpostCapacity(outpost);
    
    expect(cap2).toBe(cap1 + cfg.outpost.capacityPerLevel);
  });
});

// tests/outpost-ui.test.tsx
describe("OutpostPanel component", () => {
  test("renders storage breakdown", () => {
    const outpost = { id: "1", storage: { stone: 50 }, level: 1 };
    render(<OutpostPanel outpostId={outpost.id} />);
    expect(screen.getByText("stone")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  test("liquidate button converts to credits", () => {
    const outpost = { id: "1", storage: { stone: 100 }, level: 1 };
    render(<OutpostPanel outpostId={outpost.id} />);
    
    const initialCredits = useGameStore.getState().credits;
    fireEvent.click(screen.getByText("Convert to Credits"));
    
    expect(useGameStore.getState().credits).toBeGreaterThan(initialCredits);
    expect(outpost.storage).toEqual({});
  });
});
```

### Integration Tests

```typescript
// tests/storage-persistence.integration.test.ts
describe("Storage persistence", () => {
  test("storage survives save/load cycle", () => {
    const world = createWorld();
    const outpost = world.createOutpost(0, 10, 0);
    world.depositToOutpost(outpost.id, "stone", 75);
    
    const saveData = world.serialize();
    const newWorld = WorldModel.deserialize(saveData);
    const loadedOutpost = newWorld.getOutpost(outpost.id);
    
    expect(loadedOutpost.storage.stone).toBe(75);
  });

  test("overflow converts to credits automatically", () => {
    const world = createWorld();
    const outpost = world.createOutpost(0, 10, 0);
    world.depositToOutpost(outpost.id, "stone", 150); // Over capacity
    
    const drone = createDrone({ role: "MINER", payload: 50 });
    const initialCredits = uiSnapshot.credits;
    
    // Deposit when full
    tickDrones([drone], world, uiSnapshot, cfg, 0.016);
    
    expect(uiSnapshot.credits).toBeGreaterThan(initialCredits);
  });
});
```

## Visual Design

### Outpost Storage Indicator
- **Floating bar above outpost**: Shows fill percentage (green → yellow → red)
- **Particle effects**: Glowing aura intensity increases with stored resources
- **Icon on map**: Small icon showing storage status

### Storage UI Panel
```
┌─────────────────────────────────┐
│ Outpost #A1B2C3                 │
│ Level: 3                        │
├─────────────────────────────────┤
│ Storage: 175/250 [========  ]  │
├─────────────────────────────────┤
│ Stone:     100 units            │
│ Ore:        50 units            │
│ Gems:       25 units            │
├─────────────────────────────────┤
│ [Convert to Credits: 1,250 ¢]  │
│ [Upgrade to Lv.4: 2,250 ¢]     │
└─────────────────────────────────┘
```

## Performance Considerations

1. **Storage Updates**: Only update UI when player is viewing outpost panel (not per-frame)
2. **Serialization**: Store storage as compact JSON object (not array)
3. **Capacity Checks**: Cache calculated capacity per outpost (recalc only on level change)
4. **UI Rendering**: Virtual scrolling if >100 material types (future-proof)

## Balance Considerations

### Storage Capacity Progression
- **Level 1**: 100 units (starting)
- **Level 2**: 150 units (+50)
- **Level 3**: 200 units (+50)
- **Rationale**: Encourages multiple outposts vs. single mega-base

### Upgrade Costs
- **Level 1→2**: 1,000 credits
- **Level 2→3**: 1,500 credits (1.5x)
- **Level 3→4**: 2,250 credits (1.5x)
- **Rationale**: Significant but not prohibitive investment

### Material Exchange Rates (Placeholder)
- **Stone**: 1 credit/unit (basic material)
- **Ore**: 2 credits/unit (uncommon)
- **Gems**: 5 credits/unit (rare)
- **Note**: Rates will be refined in DESIGN012 (multi-material systems)

## Migration Notes

### Save Version 3 → 4
- **Updated structure**: `outposts[].storage` field added
- **Backward compatibility**: Old saves get empty storage `{}`
- **Forward compatibility**: If loaded in old version, storage ignored (drones still work)

### Migration Code
```typescript
// tests/save-migrations.test.ts
test("v3 outpost without storage migrates to v4", () => {
  const v3Save = {
    version: 3,
    outposts: [{ id: "1", x: 0, y: 10, z: 0, level: 1 }],
  };
  const v4Save = migrateV3ToV4(v3Save);
  expect(v4Save.outposts[0].storage).toEqual({});
});
```

## Future Enhancements

1. **Resource transfer**: Move resources between outposts via haulers
2. **Auto-liquidation**: Config option to auto-convert when storage full
3. **Storage priorities**: Player sets which materials to prioritize
4. **Logistics routing**: Smart haulers choose outpost based on capacity
5. **Visual models**: 3D storage containers visible on outpost platforms

## Implementation Phases

### Phase 1: Storage Data Model
- Add `storage` and `capacity` fields to Outpost type
- Implement `depositToOutpost` and `liquidateStorage` methods
- Update `tickDrones` to use storage instead of instant credits
- Unit tests for storage logic

### Phase 2: Configuration & Balance
- Add `OutpostConfig` to config system
- Tune capacity progression and upgrade costs
- Add material exchange rates to economy config

### Phase 3: UI Components
- Create `OutpostPanel` component with storage breakdown
- Add "Convert to Credits" and "Upgrade" buttons
- Visual indicators (fill bar, particle effects)
- Integration tests for UI interactions

### Phase 4: Save Migration
- Implement v3→v4 migration with storage field
- Test backward/forward compatibility
- Update save validation schema

### Phase 5: Polish & Documentation
- Floating storage indicators above outposts
- Performance profiling with 20 outposts
- Update ARCHITECTURE.md and GAME002

## Acceptance Criteria

- [ ] Outpost storage data model implemented
- [ ] Resources deposit to storage (not instant credits)
- [ ] Storage respects capacity limits
- [ ] Overflow automatically converts to credits
- [ ] UI panel shows storage breakdown and actions
- [ ] "Convert to Credits" button liquidates storage
- [ ] "Upgrade" button increases outpost level and capacity
- [ ] Config-driven capacity and upgrade costs
- [ ] Save migration v3→v4 with storage field
- [ ] Unit tests for storage logic (>90% coverage)
- [ ] Integration tests for storage persistence
- [ ] Visual indicators for storage status
- [ ] Performance: 60fps with 20 outposts
- [ ] Documentation updated

## References

- `memory/designs/DESIGN009-logistics-system.md` - Outpost foundation
- `memory/tasks/TASK013-logistics-haulers.md` - Current implementation
- `docs/ARCHITECTURE/GAME002-logistics-and-economy.md` - Economy design
- `src/engine/world/world.ts` - WorldModel class
- `src/components/ui/` - UI components directory
