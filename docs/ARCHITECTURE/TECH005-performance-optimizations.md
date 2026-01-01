# TECH005: Performance Optimizations

**Status:** Implemented  
**PRs:** #134, #135  
**Last updated:** 2026-01-01

## Overview

Following heavy profiling of the main-thread hotpath, a series of optimizations were implemented to reduce CPU usage and stabilize frame times. The primary issue was unbounded message processing from workers, especially during high-throughput meshing jobs.

## 🎯 Main-Thread Hotpath Fix

### Problem Statement
~50% of CPU time was spent in "On message" handlers (main-thread message processing from workers).

**Root Causes:**
1. High concurrent worker throughput (`maxInFlight: 16`).
2. Expensive main-thread geometry operations (`computeBoundingSphere`, `BufferGeometry` creation).
3. Unbounded per-frame work (processed all pending results in one frame).

### Three-Layered Optimization Strategy

#### 1. Reduce Concurrent Worker Load
- **Change:** Reduced `maxInFlight` from 16 to 4 in `src/config/meshing.ts`.
- **Impact:** 75% reduction in concurrent meshing jobs, smoothing the flow of results.

#### 2. Per-Frame Work Batching
- **Change:** Added `maxMeshesPerFrame: 4` configuration and implemented a batching mechanism in `useMeshedChunks.ts`.
- **Impact:** Bounded main-thread work per frame, preventing spikes and maintaining steady 60fps.

#### 3. Offload Bounding Sphere Computation
- **Change:** Pre-compute bounding spheres in the worker thread and transfer them with the geometry data.
- **Impact:** Eliminates expensive main-thread iteration over vertex positions.

## ⚡ Additional Optimizations

### Debounced Reprioritization
- **Problem:** `setFocusChunk()` (called every frame during movement) triggered a full priority heap rebuild.
- **Solution:** Added a 150ms debounce to `reprioritizeDirty()` calls.
- **Impact:** Reduces heap rebuild frequency from 60/sec to ~7/sec during movement, saving 5-10% CPU.

### Frame Handler Timing (Profiling Tool)
- **Feature:** Added `enableHandlerTiming` to `SimBridgeOptions`.
- **Function:** Tracks and logs avg execution time for each frame handler every 300 frames.
- **Impact:** Provides visibility into hotpath handlers without overhead when disabled.

## 📊 Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Concurrent Jobs | 16 | 4 | -75% |
| Max Meshes/Frame | Unbounded | 4 | Bounded |
| Reprioritize Frequency | 60/sec | ~7/sec | -88% |
| "On message" CPU % | ~50% | ~15-20% | -60-70% |
| Frame Time | Inconsistent | Stable 60fps | High |

## 📁 Implementation Details

### Bounding Sphere (Worker)
```typescript
// Computed in worker to save main thread cycles
const computeBoundingSphere = (positions: Float32Array) => {
  // Pass 1: Center, Pass 2: Radius
  // ...
  return { center, radius };
};
```

### Batching (Main Thread)
```typescript
// useMeshedChunks.ts
const pending = Array.from(pendingResultsRef.current.entries()).slice(0, maxPerFrame);
pending.forEach(([key, res]) => {
  pendingResultsRef.current.delete(key);
  applyMeshResult(res);
});
```

## 🧪 Testing

Verified via comprehensive test suites:
- `tests/hotpath-optimization.test.ts`: Covers batching and worker computation.
- `tests/reprioritize-debounce.test.ts`: Covers debouncing logic.
- `tests/frame-handler-timing.test.ts`: Covers profiling instrumentation.

## Related docs
- `docs/ARCHITECTURE.md` (Main architecture)
- `HOTPATH_FIX_SUMMARY.md` (Original detailed analysis - DELETED)
- `ADDITIONAL_PERFORMANCE_OPTIMIZATIONS.md` (Original detailed analysis - DELETED)
