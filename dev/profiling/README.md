# Memory Profiling & Performance Telemetry Tools

This directory contains utilities for detecting memory leaks, tracking resource usage, and monitoring runtime performance in NanoBotsIdle. These tools help ensure long-running sessions remain stable and performant.

## Overview

Memory leaks and performance regressions in a voxel game can manifest as:

- Detached DOM nodes from destroyed UI components
- Retained Three.js `Object3D` or `InstancedMesh` references
- Unclean worker termination leaving event handlers attached
- Unbounded growth in internal maps/sets for chunks or voxels
- FPS degradation from inefficient rendering or simulation logic
- Worker backlog growth from unbalanced work distribution

This profiling toolkit provides:

1. **Telemetry System** - Real-time performance monitoring in dev mode
2. **Memory Tracker** - Lightweight memory snapshots and comparison
3. **Heap Snapshot Tool** - Chrome DevTools-compatible V8 heap dumps
4. **Baseline Generator** - Automated baseline memory profile generation
5. **CI Performance Checks** - Automated regression detection in CI/CD

## Quick Start

### 1. Enable Telemetry in Dev Mode

To enable telemetry during development, add the `?telemetry=true` URL parameter:

```
http://localhost:5173/?telemetry=true
```

This will:
- Enable real-time metric collection
- Show a floating 📊 button in the bottom-right corner
- Click the button to open the telemetry panel

**Metrics Tracked:**
- **FPS**: Current, average, min, max frames per second
- **Frame Time**: Current, average, min, max milliseconds per frame
- **DPR (Device Pixel Ratio)**: Current value and change history
- **Meshing**: Average time per chunk, queue length, in-flight tasks, wait time
- **Worker**: Simulation time, backlog, error/retry counts

**Export Metrics:**
Click "Copy JSON" in the telemetry panel to copy metrics to clipboard for analysis.

### 2. Run Memory Leak Detection Tests

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

### 2b. Profile FPS + Draw Calls for Heavy Render Scenes

Use the headless profiling script to capture FPS and draw-call metrics for a heavy meshed scene:

```bash
npm run dev
node scripts/profile.js --scene meshed-heavy --duration 30 --output ./profile-metrics.json
```

To include occlusion culling in the benchmark:

```bash
node scripts/profile.js --scene meshed-heavy-occlusion --duration 30 --output ./profile-metrics.json
```

Load the resulting JSON in `docs/performance-dashboard.html` to visualize FPS, frame time, and draw calls.

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

## CI Performance Regression Detection

The repository includes automated performance regression detection that runs in CI/CD pipelines.

### Overview

On every PR, the CI system:
1. Runs a headless browser session with telemetry enabled
2. Collects performance metrics for 30 seconds
3. Compares against the baseline from the main branch
4. Fails the build if regressions exceed configured thresholds

### Running Performance Checks Locally

```bash
# Run the profiler (ensure dev server is running)
npm run dev &
sleep 5  # Wait for server to start
node scripts/profile.js --duration 30 --output ./my-metrics.json

# Compare against baseline
node scripts/check-performance-regression.js \
  --current ./my-metrics.json \
  --baseline ./path/to/baseline.json \
  --output ./regression-report.json
```

### Configuring Thresholds

Edit `.github/performance-thresholds.json` to adjust acceptable regression limits:

```json
{
  "thresholds": {
    "fps": {
      "regressionPercent": 10,  // Max 10% FPS decrease
      "avgMin": 55               // Minimum acceptable average FPS
    },
    "frameTime": {
      "regressionPercent": 15,  // Max 15% frame time increase
      "avgMax": 18               // Maximum acceptable average frame time (ms)
    }
  }
}
```

### Understanding Regression Reports

When a regression is detected, the CI output will show:

```
❌ FPS regression detected: -13.33% (threshold: 10%)

| Metric | Baseline | Current | Change | Threshold | Status |
|--------|----------|---------|--------|-----------|--------|
| FPS (avg) | 60.00 | 52.00 | -13.33% | ±10% | ❌ FAIL |
```

**Status indicators:**
- ✅ PASS: Within acceptable thresholds
- ⚠️  WARN: Exceeds absolute limits but not regression threshold
- ❌ FAIL: Exceeds regression threshold

### Troubleshooting CI Performance Failures

**1. Check the regression report artifact**
- Download the `regression-report.json` from the CI run
- Contains detailed metrics and comparison data

**2. Identify the cause**
- Review recent changes that might affect performance
- Check if new features added significant computational cost
- Look for inefficient loops, allocations, or render operations

**3. Common causes:**
- Increased object allocation in hot paths (useFrame, workers)
- New features without optimization
- Inefficient data structures or algorithms
- Missing caching or memoization
- Blocking operations in render loop

**4. Fixing regressions**
- Profile locally with telemetry panel
- Use browser DevTools Performance tab
- Check worker backlog for task queueing issues
- Optimize hot paths identified in telemetry

**5. Adjusting thresholds (last resort)**
- If the regression is intentional (e.g., new features with known cost)
- Document why thresholds were adjusted in the commit message
- Consider if optimization can reduce the impact

### Warning-Only Mode

To temporarily bypass CI failures while investigating:

```yaml
# In .github/workflows/profile.yml
env:
  PERF_WARNING_ONLY: true
```

Or locally:
```bash
node scripts/check-performance-regression.js \
  --current ./current.json \
  --baseline ./baseline.json \
  --warning-only
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
