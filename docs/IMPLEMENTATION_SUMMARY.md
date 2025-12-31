# Runtime Telemetry and CI Profiling - Implementation Summary

## Overview

This implementation adds comprehensive runtime telemetry and CI profiling capabilities to NanoBotsIdle, enabling performance monitoring, regression detection, and optimization targeting.

## What Was Implemented

### 1. Telemetry System

**Files Created:**
- `src/config/telemetry.ts` - Configuration for telemetry features
- `src/telemetry/TelemetryCollector.ts` - Core telemetry collection logic
- `src/telemetry/index.ts` - Public API exports

**Metrics Tracked:**
- **FPS**: Current, average, min, max, percentiles (p50, p95, p99)
- **Frame Time**: Time per frame in milliseconds
- **Meshing Time**: Per-chunk geometry generation time
- **Meshing Queue**: Queue length, in-flight jobs, wait times
- **Worker Stats**: Simulation worker processing time and backlog

**Key Features:**
- Opt-in via config (disabled by default)
- Minimal performance overhead when disabled
- Rolling history with configurable window size
- JSON export for external analysis
- Browser console API access

### 2. Integration Points

**Modified Files:**
- `src/App.tsx` - Worker stats collection, window API exposure
- `src/components/DynamicResScaler.tsx` - FPS and frame time tracking
- `src/meshing/meshingScheduler.ts` - Meshing queue and timing
- `src/worker/meshing.worker.ts` - Per-chunk timing instrumentation
- `src/shared/meshingProtocol.ts` - Added timing metadata to protocol
- `src/index.tsx` - URL parameter support, config exposure
- `src/config/index.ts` - Added telemetry to config structure

### 3. Profiling Infrastructure

**Files Created:**
- `scripts/profile.js` - Headless profiling script using Playwright
- `.github/workflows/profile.yml` - CI profiling workflow

**Capabilities:**
- Headless browser profiling with configurable duration
- Automatic sampling every second
- Aggregate statistics computation (avg, min, max, percentiles)
- JSON artifact export
- Local and CI execution support

### 4. CI/CD Integration

**GitHub Actions Workflow:**
- Runs on push to main and on pull requests
- 30-second profiling session
- Baseline comparison against main branch
- Regression detection with percentage changes
- Artifact storage for historical analysis
- GitHub step summary with metrics table

**Comparison Features:**
- Side-by-side metrics comparison
- Percentage change calculations
- Visual formatting in PR comments
- 30-day artifact retention for current runs
- 90-day retention for baseline metrics

### 5. Documentation

**Files Created:**
- `docs/PROFILING.md` - Comprehensive profiling guide
- `docs/performance-dashboard.html` - Interactive metrics visualizer
- Updated `README.md` with profiling instructions

**Documentation Coverage:**
- Local profiling setup and usage
- Browser console access
- CI/CD profiling workflows
- Performance targets and thresholds
- Troubleshooting guide
- Best practices
- Advanced topics (custom metrics, flamegraphs, memory profiling)

### 6. Testing

**Files Created:**
- `tests/telemetry.test.ts` - 9 comprehensive tests

**Test Coverage:**
- FPS metrics collection
- Frame time tracking
- Meshing metrics
- Queue state tracking
- Worker stats recording
- Enable/disable functionality
- JSON export
- History reset
- History trimming

## Usage Examples

### Local Profiling

```bash
# Quick profile
npm run build
npm run preview
npm run profile

# Custom duration and output
node scripts/profile.js --duration 60 --output ./my-metrics.json
```

### Browser Console

```javascript
// Enable telemetry
window.updateConfig({ telemetry: { enabled: true } });

// Get snapshot
const metrics = JSON.parse(window.getTelemetrySnapshot());
console.table(metrics.fps);
```

### URL Parameter

```
http://localhost:5173?telemetry=true
```

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| FPS | ≥60 | <55 | <45 |
| Frame Time | ≤16.7ms | >18ms | >22ms |
| Meshing Time/Chunk | ≤10ms | >15ms | >25ms |
| Worker SimMs | ≤10ms | >15ms | >20ms |

## Metrics JSON Structure

```json
{
  "meta": {
    "url": "http://localhost:4173?telemetry=true",
    "duration": 30,
    "samplesCollected": 30,
    "timestamp": "2025-12-30T22:00:00.000Z"
  },
  "aggregate": {
    "fps": { "avg": 60, "min": 58, "max": 62, "p50": 60, "p95": 61, "p99": 62 },
    "frameTime": { "avg": 16.6, "min": 16.1, "max": 17.2, "p50": 16.6, "p95": 17.0, "p99": 17.1 },
    "meshingTime": { "avg": 5.2, "min": 4.5, "max": 6.8, "p50": 5.1, "p95": 6.2, "p99": 6.5 },
    "workerSimMs": { "avg": 8.5, "min": 7.8, "max": 9.2, "p50": 8.4, "p95": 9.0, "p99": 9.1 },
    "totalChunksMeshed": 150
  },
  "history": [...]
}
```

## Design Decisions

### Why Opt-In?

Telemetry is opt-in to avoid any performance impact in production builds where monitoring isn't needed. It must be explicitly enabled via:
1. Config: `updateConfig({ telemetry: { enabled: true } })`
2. URL parameter: `?telemetry=true`

### Why Playwright?

Playwright provides:
- Cross-browser support (focusing on Chromium for CI)
- Headless mode for CI environments
- Easy page manipulation and JavaScript execution
- Reliable automation APIs

### Why JSON Artifacts?

JSON format provides:
- Human-readable for quick inspection
- Machine-parseable for automated analysis
- Easy diff/comparison in CI
- Compatible with visualization tools

### Why 30-Second Duration?

30 seconds provides:
- Enough samples for statistical significance (~30 samples at 1Hz)
- Fast CI execution (keeps workflow under 2 minutes)
- Representative of typical gameplay sessions
- Balance between data quality and execution time

## Technical Implementation Details

### Telemetry Collection Pattern

```typescript
// Singleton pattern for global access
const telemetry = getTelemetryCollector();

// Conditional recording (no-op when disabled)
if (config.telemetry.enabled) {
  telemetry.recordFps(fps);
}

// Export snapshot
const json = telemetry.exportJSON();
```

### Minimal Performance Impact

- Early returns when disabled (no computation)
- Rolling history with size limits (no unbounded growth)
- Efficient data structures (arrays for O(1) append)
- Batched processing (compute stats only on export)

### CI Integration Pattern

```yaml
1. Build application
2. Start preview server
3. Wait for server ready
4. Run profiling script
5. Upload metrics artifact
6. Download baseline (if PR)
7. Compare and report
8. Store new baseline (if main)
```

## Future Enhancements

Potential additions for future work:

1. **Real-time Dashboard**: WebSocket-based live metrics streaming
2. **Custom Events**: Application-specific performance markers
3. **Memory Profiling**: Heap snapshots and leak detection
4. **Network Metrics**: API call timing and bandwidth usage
5. **Automated Alerts**: Slack/email notifications for regressions
6. **Historical Trends**: Time-series database for long-term tracking
7. **A/B Testing**: Metrics comparison between different implementations
8. **Flamegraph Integration**: Automated CPU profiling
9. **Mobile Metrics**: Device-specific performance tracking
10. **User Metrics**: RUM (Real User Monitoring) integration

## Testing Results

All tests pass successfully:
- **Total Tests**: 83 tests across 37 test files
- **New Tests**: 9 telemetry-specific tests
- **Test Coverage**: Core telemetry functionality
- **Integration Tests**: Existing tests verify no regressions

## Acceptance Criteria

✅ **All acceptance criteria met:**

1. ✅ Instrument dev builds with metrics
   - FPS, frame time, meshing time, worker queue, wait times tracked
   - Opt-in via config
   - Exposed as JSON via window API

2. ✅ Add CI profiling job
   - GitHub Actions workflow created
   - Headless scenario execution
   - Metrics artifact storage
   - Baseline comparison and diff reporting

3. ✅ Add dashboard/JSON artifact
   - JSON output with aggregate statistics
   - Interactive HTML dashboard
   - Reviewable in CI reports via artifacts

4. ✅ Add README profiling instructions
   - Local profiling guide
   - Browser console access
   - CI workflow documentation
   - Comprehensive PROFILING.md guide

## Conclusion

This implementation provides a solid foundation for continuous performance monitoring and regression detection. The telemetry system is non-invasive (opt-in), comprehensive (tracks all key metrics), and integrated with CI/CD for automated monitoring. The documentation ensures developers can easily profile locally and understand CI results.
