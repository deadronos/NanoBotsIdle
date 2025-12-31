# Performance Profiling Guide

## Overview

NanoBotsIdle includes a comprehensive telemetry and profiling system to track runtime performance metrics and detect regressions. The system collects:

- **FPS (Frames Per Second)**: Rendering performance
- **Frame Time**: Time to render each frame (ms)
- **Meshing Time**: Time to generate chunk geometry (ms per chunk)
- **Worker Queue**: Simulation worker queue length and processing time
- **Meshing Queue**: Meshing worker queue state and wait times

## Local Profiling

### Quick Start

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the preview server:
   ```bash
   npm run preview
   ```

3. Run the profiling script:
   ```bash
   npm run profile
   ```

This will produce a `profile-metrics.json` file with performance data.

### Custom Profile Options

```bash
node scripts/profile.js --duration 60 --output ./my-profile.json --url http://localhost:4173
```

Options:
- `--duration <seconds>`: Profile duration (default: 30)
- `--output <path>`: Output file path (default: `./profile-metrics.json`)
- `--url <url>`: Target URL (default: `http://localhost:4173`)

### Understanding the Output

The metrics file contains:

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
  "history": [
    { "timestamp": 1234567890, "fps": { "current": 60, ... }, ... }
  ]
}
```

**Key Metrics:**
- **avg**: Average value over the profiling period
- **min/max**: Minimum and maximum observed values
- **p50/p95/p99**: Percentile values (median, 95th, 99th percentile)

## Browser Console Access

Enable telemetry and access metrics directly in the browser:

1. Open the app with telemetry enabled:
   ```
   http://localhost:5173?telemetry=true
   ```

2. Open browser console and run:
   ```javascript
   // Get current snapshot
   const metrics = JSON.parse(window.getTelemetrySnapshot());
   console.table(metrics.fps);
   console.table(metrics.meshing);
   
   // Enable/disable telemetry dynamically
   window.updateConfig({ telemetry: { enabled: true } });
   ```

## CI/CD Profiling

### Automatic Profiling

The CI pipeline automatically profiles:
- Every push to `main`
- Every pull request

### Viewing CI Results

1. Go to the **Actions** tab in GitHub
2. Select the **Performance Profiling** workflow
3. View the summary with performance metrics
4. Download artifacts for detailed analysis

### Baseline Comparison

On pull requests, the CI compares your changes against the `main` branch baseline:

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| FPS | 60.0 | 58.5 | -1.5 (-2.5%) |
| Frame Time (ms) | 16.6 | 17.1 | +0.5 (+3.0%) |
| Meshing Time (ms) | 5.2 | 5.8 | +0.6 (+11.5%) |

Significant regressions will be flagged for review.

## Performance Targets

Recommended performance targets for this application:

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| FPS | ≥60 | <55 | <45 |
| Frame Time | ≤16.7ms | >18ms | >22ms |
| Meshing Time/Chunk | ≤10ms | >15ms | >25ms |
| Worker SimMs | ≤10ms | >15ms | >20ms |

## Troubleshooting

### Profile Script Fails

If the profile script fails:

1. Ensure Playwright browsers are installed:
   ```bash
   npx playwright install chromium
   ```

2. Verify the server is running:
   ```bash
   curl http://localhost:4173
   ```

3. Check browser logs:
   ```bash
   node scripts/profile.js --url http://localhost:4173
   ```

### No Telemetry Data

If no telemetry is collected:

1. Verify telemetry is enabled via URL parameter: `?telemetry=true`
2. Check browser console for errors
3. Ensure `window.getTelemetrySnapshot` is available

### High Variance in Metrics

High variance may indicate:
- Background processes affecting performance
- Thermal throttling
- Garbage collection spikes
- Network activity

Run multiple profiles and compare aggregate statistics.

## Advanced Topics

### Custom Metrics

To add custom metrics to the telemetry system:

1. Extend `TelemetrySnapshot` type in `src/telemetry/TelemetryCollector.ts`
2. Add recording method to `TelemetryCollector` class
3. Instrument your code to call the recording method
4. Update `getSnapshot()` to include your metrics

### Flamegraphs

For CPU profiling, use browser DevTools:

1. Open DevTools Performance tab
2. Record while running the app
3. Analyze flamegraphs and call trees
4. Export trace for deeper analysis

### Memory Profiling

To track memory usage:

1. Use DevTools Memory tab
2. Take heap snapshots at intervals
3. Compare snapshots to detect leaks
4. Look for detached DOM nodes and retained objects

## Best Practices

1. **Profile in Production Mode**: Always build and profile production builds, not dev builds
2. **Consistent Environment**: Profile on similar hardware/configurations for comparison
3. **Warm-up Period**: Allow the app to warm up before collecting metrics
4. **Multiple Runs**: Run profiles multiple times and average results
5. **Document Changes**: Note any code changes that significantly impact metrics
6. **Set Baselines**: Establish performance baselines for each major feature
7. **Monitor Trends**: Track metrics over time to spot gradual regressions

## References

- [Telemetry Collector Source](../src/telemetry/TelemetryCollector.ts)
- [Profile Script Source](../scripts/profile.js)
- [CI Workflow](../.github/workflows/profile.yml)
- [React Three Fiber Performance Tips](https://docs.pmnd.rs/react-three-fiber/advanced/pitfalls)
