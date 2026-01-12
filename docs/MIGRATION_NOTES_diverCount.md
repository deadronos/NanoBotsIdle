# Save Migration: diverCount Field

**Date:** 2026-01-12  
**Feature:** Underwater DIVER Drones  
**Related Design:** memory/designs/DESIGN010-underwater-drones.md  
**Related Task:** memory/tasks/TASK014-underwater-drones-poc.md

## Changes Summary

Added `diverCount` field to `UiSnapshot` type in save system.

## Schema Changes

### Before (Current Production)
```typescript
export type UiSnapshot = {
  credits: number;
  prestigeLevel: number;
  droneCount: number;
  haulerCount: number;
  miningSpeedLevel: number;
  moveSpeedLevel: number;
  laserPowerLevel: number;
  minedBlocks: number;
  totalBlocks: number;
  upgrades: Record<string, number>;
  outposts: { id: string; x: number; y: number; z: number; level: number }[];
  nextCosts?: Record<string, number>;
  actualSeed?: number;
};
```

### After (With DIVER Support)
```typescript
export type UiSnapshot = {
  credits: number;
  prestigeLevel: number;
  droneCount: number;
  haulerCount: number;
  diverCount: number; // NEW FIELD
  miningSpeedLevel: number;
  moveSpeedLevel: number;
  laserPowerLevel: number;
  minedBlocks: number;
  totalBlocks: number;
  upgrades: Record<string, number>;
  outposts: { id: string; x: number; y: number; z: number; level: number }[];
  nextCosts?: Record<string, number>;
  actualSeed?: number;
};
```

## Backward Compatibility

### Loading Old Saves
- **Default Value:** Old saves without `diverCount` will default to `0`
- **Implementation:** All initialization points use `saveState?.diverCount ?? 0`
- **Impact:** No data loss, players start with 0 divers (expected behavior)

### Affected Files
- `src/shared/protocol.ts` - Type definition
- `src/shared/schemas.ts` - Zod validation schema
- `src/engine/engine.ts` - Engine initialization
- `src/store.ts` - Zustand store
- `src/ui/store.ts` - UI store default snapshot
- `src/simBridge/createSimBridge.ts` - Worker messaging

## Forward Compatibility

### Saving with New Field
- **Behavior:** New saves will include `diverCount` field
- **Value:** Integer >= 0 (number of diver drones owned)
- **Storage:** Persisted via Zustand middleware, worker snapshot

### Loading New Saves in Old Code
- **Impact:** Old versions will ignore `diverCount` field (graceful degradation)
- **Behavior:** Players will lose diver drone count if they revert to old version
- **Mitigation:** None needed (forward compatibility is best-effort)

## Migration Strategy

### No Explicit Migration Function Needed
This change is **additive** and uses default values, so no explicit migration function is required. The existing save loading logic handles missing fields with the `??` operator.

### If Explicit Migration Were Needed (Reference)
```typescript
// Example migration function (NOT REQUIRED for this change)
export const migrateToV_DIVER = (oldSave: SaveV_OLD): SaveV_NEW => {
  return {
    ...oldSave,
    diverCount: oldSave.diverCount ?? 0, // Add missing field with default
  };
};
```

## Testing

### Test Coverage
- ✅ Unit tests verify default value (tests/drones-diver-types.test.ts)
- ✅ Integration tests handle missing field (tests/drones-diver-spawning.test.ts)
- ✅ Schema validation tests updated (tests/zodSchemas.test.ts)
- ✅ All existing save/load tests pass with new field

### Manual Testing Checklist
- [ ] Load old save without diverCount → defaults to 0
- [ ] Purchase diver drone → diverCount increments
- [ ] Save with diverCount → persists correctly
- [ ] Load save with diverCount → restores correctly

## Rollout Considerations

### Deployment
- **Safe to deploy:** Yes, additive change with defaults
- **Requires data migration:** No
- **Requires user action:** No

### Rollback
- **Can rollback:** Yes, with caveats
- **Data loss on rollback:** Players lose diver drone count
- **Mitigation:** Save backup before upgrade (optional)

## Related Documentation
- Design: `memory/designs/DESIGN010-underwater-drones.md`
- Task: `memory/tasks/TASK014-underwater-drones-poc.md`
- Implementation: Pull request #[TBD]
