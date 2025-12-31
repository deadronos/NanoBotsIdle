# Postmortem: Voxel Rendering Holes Fix

**Date**: December 30, 2024  
**Issue**: Missing terrain ("holes") in both Frontier and Meshed render modes

---

## Summary

Both voxel render modes had significant holes in terrain rendering when players moved around the world. The root causes were different for each mode but both involved data synchronization issues between the engine (worker) and client.

---

## Frontier Mode Fix

### Symptom
- `trueFrontierMissingCount` showed ~70% of voxels missing
- Visual holes appeared when moving into new terrain areas
- Drones could mine correctly, but movement-based terrain wasn't populating

### Root Cause
In `engine.ts`, when a `pendingFrontierSnapshot` existed, it **completely replaced** `frontierAdded`:

```typescript
// BEFORE (bug):
if (pendingFrontierSnapshot) {
  delta.frontierAdd = pendingFrontierSnapshot;  // Overwrites incremental updates!
  ...
}
```

When `REQUEST_FRONTIER_SNAPSHOT` was called (e.g., when switching to frontier mode), any incremental voxels from `ensureFrontierInChunk` were discarded.

### Fix
Changed to **merge** both arrays instead of replacing:

```typescript
// AFTER (fix):
if (pendingFrontierSnapshot) {
  if (frontierAdded.length > 0) {
    const merged = new Float32Array(pendingFrontierSnapshot.length + frontierAdded.length);
    merged.set(pendingFrontierSnapshot, 0);
    merged.set(new Float32Array(frontierAdded), pendingFrontierSnapshot.length);
    delta.frontierAdd = merged;
  } else {
    delta.frontierAdd = pendingFrontierSnapshot;
  }
  ...
}
```

**Files Modified**: `src/engine/engine.ts`

---

## Meshed Mode Fix

Meshed mode had **two issues**:

### Issue 1: Seed Mismatch

#### Symptom
- Meshed terrain showed large holes/incorrect geometry
- Different terrain than frontier mode

#### Root Cause
The engine may use a **modified seed** during world generation:

```typescript
// In initWorld.ts:
const candidateSeed = baseSeed + attempt * 101;  // Worker may use this
```

But the client's meshing used `getSeed(prestigeLevel)` which only returns `baseSeed`. This caused completely different terrain calculations!

#### Fix
1. Added `actualSeed` to `WorldInitResult` return type
2. Exposed `actualSeed` through `UiSnapshot` protocol
3. Passed `actualSeed` from UI store to meshing hook
4. Added `seedOverride` parameter to `getVoxelMaterialAt`

**Files Modified**: 
- `src/engine/world/initWorld.ts`
- `src/shared/protocol.ts`
- `src/engine/engine.ts`
- `src/sim/collision.ts`
- `src/components/world/useMeshedChunks.ts`
- `src/components/World.tsx`

---

### Issue 2: Scheduler/ActiveChunks Desync

#### Symptom
- Debug showed chunks "pending" but scheduler showed no work
- Only ~8 chunks rendered, 25+ missing

#### Root Cause
When `actualSeed` arrived from the worker, the scheduler's `useEffect` dependencies included `seed`, so the scheduler was **recreated**. But `activeChunks` ref was NOT cleared:

1. Component mounts, starts requesting chunks → added to `activeChunks`
2. `actualSeed` arrives from worker
3. Scheduler useEffect re-runs (seed changed), creates NEW scheduler with empty dirty set
4. Old chunks in `activeChunks` never re-added to new scheduler

#### Fix
Added `onSchedulerChange` callback to `useMeshedChunks`:

```typescript
// In useMeshedChunks.ts:
schedulerRef.current = scheduler;
onSchedulerChange?.();  // Notify parent

// In World.tsx:
const handleSchedulerChange = useCallback(() => {
  activeChunks.current.clear();  // Forces re-discovery
  initialSurfaceChunkRef.current = null;
  lastRequestedPlayerChunkRef.current = null;
}, []);
```

**Files Modified**: 
- `src/components/world/useMeshedChunks.ts`
- `src/components/World.tsx`

---

## Key Learnings

1. **Data flow synchronization**: When multiple systems track state (scheduler dirty set, activeChunks ref), they must stay in sync across lifecycle events.

2. **React effect dependencies**: Including derived values (like `seed`) in effect deps can cause unexpected recreations. Consider whether callbacks should be stable or recreated.

3. **Merge vs Replace**: When combining incremental and snapshot data, prefer merging to avoid data loss.

4. **Seed propagation**: When terrain generation allows retries with different seeds, the actual seed must flow through the entire rendering pipeline.
