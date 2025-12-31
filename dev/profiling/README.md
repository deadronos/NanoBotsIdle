# Memory Profiling Tools

This directory contains utilities for detecting memory leaks and tracking resource usage in NanoBotsIdle. These tools help ensure long-running sessions remain stable and performant.

## Overview

Memory leaks in a voxel game can manifest as:

- Detached DOM nodes from destroyed UI components
- Retained Three.js `Object3D` or `InstancedMesh` references
- Unclean worker termination leaving event handlers attached
- Unbounded growth in internal maps/sets for chunks or voxels

This profiling toolkit provides:

1. **Memory Tracker** - Lightweight memory snapshots and comparison
2. **Heap Snapshot Tool** - Chrome DevTools-compatible V8 heap dumps
3. **Baseline Generator** - Automated baseline memory profile generation

## Quick Start

### 1. Run Memory Leak Detection Tests

```bash
npm test -- lifecycle
```

These tests verify that:

- Chunk operations don't accumulate unbounded state
- Worker termination cleans up event handlers
- InstancedMesh updates don't leak references

### 2. Generate Baseline Memory Profile

```bash
node --expose-gc dev/profiling/baseline-generator.js
```

This simulates common operations and captures heap snapshots for regression detection.

### 3. Analyze Heap Snapshots

Snapshots are saved in `dev/profiling/snapshots/` as `.heapsnapshot` files.

To analyze:

1. Open Chrome DevTools (F12)
2. Go to the **Memory** tab
3. Click **Load** and select a `.heapsnapshot` file
4. Use the **Comparison** view to compare snapshots

## Tools

### Memory Tracker

Lightweight utility for tracking memory usage across operations.

**Usage:**

```typescript
import { MemoryTracker } from "./dev/profiling/memory-tracker";

const tracker = new MemoryTracker();

tracker.snapshot("before-operation");

// ... perform operations ...

tracker.snapshot("after-operation");

const delta = tracker.compare("before-operation", "after-operation");
console.log(`Heap growth: ${(delta.heapUsedDelta / 1024 / 1024).toFixed(2)} MB`);

console.log(tracker.report());
```

**Leak Detection Helper:**

```typescript
import { detectLeak } from "./dev/profiling/memory-tracker";

const result = await detectLeak({
  fn: () => {
    // Your repeated operation
    const scheduler = createScheduler();
    scheduler.markDirty({ cx: 0, cy: 0, cz: 0 });
    scheduler.dispose();
  },
  iterations: 1000,
  snapshotInterval: 100,
  gcBetweenIterations: true,
});

if (result.leaked) {
  console.log("LEAK DETECTED!");
  console.log(`Growth rate: ${result.growthRate} bytes/iteration`);
}
console.log(result.report);
```

### Heap Snapshot Tool

Captures V8 heap snapshots for detailed analysis in Chrome DevTools.

**Usage:**

```typescript
import { takeHeapSnapshot, compareSnapshots } from "./dev/profiling/heap-snapshot";

// Take a snapshot
await takeHeapSnapshot("./dev/profiling/snapshots", "my-snapshot");

// Compare two snapshots
const report = compareSnapshots(
  "./dev/profiling/snapshots/baseline.heapsnapshot",
  "./dev/profiling/snapshots/current.heapsnapshot",
);
console.log(report);
```

### Baseline Generator

Automated script that simulates common operations and generates baseline memory profiles.

**Run with:**

```bash
# Recommended: with garbage collection exposed
node --expose-gc dev/profiling/baseline-generator.js

# With TypeScript support
node --expose-gc -r ts-node/register dev/profiling/baseline-generator.ts
```

**What it does:**

1. Takes initial heap snapshot
2. Simulates 10 cycles of chunk load/unload (100 chunks each)
3. Simulates repeated memory allocations
4. Cleans up and takes final snapshot
5. Generates a memory growth report

**Output:**

- Console report showing memory deltas between phases
- `.heapsnapshot` files in `dev/profiling/snapshots/`
- `.meta.json` metadata files for each snapshot

## Interpreting Results

### Memory Growth Indicators

**Healthy patterns:**

- Memory increases during operations but returns to baseline after cleanup
- Small, bounded growth in long-running sessions (< 1KB per iteration)
- Stable heap size after garbage collection

**Leak indicators:**

- Unbounded linear growth over iterations
- Memory not returning to baseline after cleanup
- Large growth rate (> 1KB per iteration)
- Heap size continuing to grow after GC

### Chrome DevTools Analysis

**Allocation Timeline:**

1. Load a snapshot in Chrome DevTools Memory tab
2. Switch to **Allocation instrumentation on timeline**
3. Look for patterns of retained objects

**Comparison View:**

1. Load two snapshots (baseline and current)
2. Switch to **Comparison** view
3. Look for:
   - Increased object counts (especially `Object3D`, `InstancedMesh`, `Worker`)
   - Growing arrays/maps (`Set`, `Map`, `Array`)
   - Detached DOM nodes
   - Retained closures

**Dominators:**

- Shows which objects are retaining the most memory
- Helps identify root causes of leaks

## Common Leak Patterns

### 1. Event Listeners

**Problem:** Handlers not removed when objects are disposed.

**Detection:**

```typescript
// Check handler attachment in tests
expect(worker.hasHandlerAttached()).toBe(false);
```

**Fix:**

```typescript
scheduler.dispose(); // Should call removeEventListener
```

### 2. Circular References

**Problem:** Objects holding references to each other, preventing GC.

**Detection:** Look for closure chains in heap snapshot.

**Fix:** Break references explicitly or use `WeakMap`/`WeakSet`.

### 3. Unbounded Collections

**Problem:** Maps/Sets growing indefinitely.

**Detection:**

```typescript
// In tests, verify collection size after operations
expect(scheduler.getDirtyKeys().length).toBe(0);
```

**Fix:** Implement size limits, LRU caches, or periodic cleanup.

### 4. Retained DOM Nodes

**Problem:** React components unmounted but DOM nodes still referenced.

**Detection:** "Detached DOM tree" in heap snapshot.

**Fix:** Ensure refs are cleared and event handlers removed on unmount.

## npm Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "profile:baseline": "node --expose-gc dev/profiling/baseline-generator.js",
    "profile:track": "node --expose-gc -r ts-node/register dev/profiling/your-script.ts",
    "test:lifecycle": "vitest run lifecycle"
  }
}
```

## CI Integration (Optional)

For regression detection in CI:

1. Generate baseline on main branch
2. Store baseline snapshot as artifact
3. On PR, generate new snapshot
4. Compare and fail if growth exceeds threshold

**Example GitHub Actions step:**

```yaml
- name: Memory leak check
  run: |
    node --expose-gc dev/profiling/baseline-generator.js
    # Compare with stored baseline
    # Fail if growth > 10MB
```

## Troubleshooting

### "Worker is not defined" in tests

This is expected in Node.js test environment. Worker lifecycle tests use mock workers.

### "v8 module not available"

Heap snapshots require Node.js v8.x+. Ensure you're using a recent Node version.

### High memory usage during profiling

This is expected. The profiling tools themselves allocate memory for snapshots and tracking.

### Garbage collection not running

Run with `--expose-gc` flag to enable manual GC triggering:

```bash
node --expose-gc your-script.js
```

## Best Practices

1. **Profile regularly** - Catch leaks early in development
2. **Test lifecycle** - Always test create/destroy cycles
3. **Monitor production** - Track heap size in long-running sessions
4. **Document cleanup** - Explicitly document disposal patterns
5. **Review snapshots** - Periodically compare against baseline

## Resources

- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Three.js Disposal Best Practices](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects)

## Contributing

When adding new systems that allocate resources:

1. Add lifecycle tests to verify cleanup
2. Update baseline generator to include new operations
3. Document disposal patterns in code comments
