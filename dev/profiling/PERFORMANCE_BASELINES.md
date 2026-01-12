# Performance Baselines and Benchmarking Guide

This guide explains how to run performance baselines, interpret metrics, and maintain healthy performance standards in NanoBotsIdle.

## Overview

Performance baselines are reference measurements that establish expected performance characteristics. They help detect regressions and ensure consistent game performance across code changes.

## Running Baselines

### Local Development

**1. Start the dev server with telemetry:**
```bash
npm run dev
```

**2. Open the game with telemetry enabled:**
```
http://localhost:5173/?telemetry=true
```

**3. Monitor metrics in the telemetry panel:**
- Click the 📊 button in the bottom-right corner
- Observe FPS, frame time, meshing stats, and worker metrics
- Look for trends and spikes during gameplay

**4. Export metrics for analysis:**
- Click "Copy JSON" in the telemetry panel
- Save to a file for later comparison
- Review aggregate statistics

### Headless CI Profile

**Run a full headless profile (same as CI):**
```bash
# Start preview server
npm run build
npm run preview &

# Wait for server
sleep 5

# Run profile
node scripts/profile.js \
  --duration 30 \
  --output ./profile-metrics.json \
  --url http://localhost:4173
```

**Check results:**
```bash
cat profile-metrics.json | jq '.aggregate'
```

## Interpreting Metrics

### FPS (Frames Per Second)

**Good:** 60 FPS sustained, minimal drops below 55
**Acceptable:** 55-60 FPS average, occasional drops to 50
**Poor:** Below 50 FPS average or frequent drops below 45

**What affects FPS:**
- Draw calls and geometry complexity
- Particle system overhead
- Inefficient shaders or post-processing
- JavaScript execution blocking the render loop

**How to improve:**
- Reduce draw calls via instancing
- Optimize LOD and culling
- Profile with browser DevTools Performance tab
- Check DPR scaling is working (resolution reduces when FPS drops)

### Frame Time

**Good:** < 16.7ms average (60 FPS = 16.7ms per frame)
**Acceptable:** 16.7-18ms average
**Poor:** > 20ms average

**What affects frame time:**
- All factors that affect FPS
- Garbage collection pauses
- Long-running synchronous operations
- Heavy allocations in `useFrame` callbacks

**How to improve:**
- Avoid allocations in hot paths
- Use object pooling for frequently created objects
- Batch updates and minimize DOM manipulations
- Profile with React DevTools Profiler

### DPR (Device Pixel Ratio / Resolution Scale)

**Good:** DPR stays at or near maximum (typically 2.0 on retina displays)
**Acceptable:** Occasional drops to 1.5-1.8 during heavy load
**Poor:** Frequent drops below 1.5 or sustained low DPR

**What affects DPR:**
- Dynamic resolution scaling reacts to FPS drops
- More DPR changes = more performance variability
- Low DPR = reduced visual quality for performance

**How to improve:**
- Fix underlying FPS issues
- Tune DPR scaling thresholds in `dynamicResScaler.ts`
- Consider if aggressive scaling is masking performance problems

### Meshing Time

**Good:** < 5ms average per chunk
**Acceptable:** 5-8ms average
**Poor:** > 10ms average

**What affects meshing time:**
- Chunk complexity (voxel count)
- Greedy meshing algorithm efficiency
- Worker availability and load distribution

**How to improve:**
- Optimize meshing algorithm
- Reduce chunk resolution if acceptable
- Increase worker pool size
- Check for meshing queue backlog

### Worker Simulation Time

**Good:** < 10ms average
**Acceptable:** 10-15ms average
**Poor:** > 15ms average or growing backlog

**What affects worker sim time:**
- Entity count (drones, haulers)
- Simulation complexity
- Message passing overhead

**How to improve:**
- Optimize simulation logic
- Batch entity updates
- Reduce message frequency between main thread and worker
- Profile worker code separately

### Queue and Backlog Metrics

**Meshing Queue:**
- **Good:** < 10 pending chunks, < 5 in-flight
- **Acceptable:** 10-20 pending, 5-10 in-flight
- **Poor:** > 20 pending or growing queue

**Worker Backlog:**
- **Good:** 0-2 frames behind
- **Acceptable:** 2-5 frames behind
- **Poor:** > 5 frames or consistently growing

**Queue growth indicates:**
- Work is being created faster than it can be processed
- Need to throttle work submission or increase capacity
- Potential infinite loop or unbounded generation

## CI Regression Thresholds

The CI pipeline uses these default thresholds (configurable in `.github/performance-thresholds.json`):

| Metric | Threshold | Description |
|--------|-----------|-------------|
| FPS | ±10% | Max allowed FPS regression from baseline |
| Frame Time | ±15% | Max allowed frame time increase from baseline |
| Meshing Time | ±20% | Max allowed meshing time increase from baseline |
| Worker Sim | ±20% | Max allowed worker sim time increase from baseline |

**Thresholds are intentionally generous** to avoid false positives from normal variance.

## Establishing New Baselines

When major features or optimizations change expected performance characteristics:

**1. Verify the change is intentional:**
- Document why performance profile changed
- Ensure it's an acceptable trade-off (e.g., new features for slight perf cost)
- Check that absolute metrics still meet acceptable standards

**2. Update baseline in CI:**
```bash
# Run a full profile on the new code
node scripts/profile.js --duration 60 --output ./new-baseline.json

# Review metrics
cat new-baseline.json | jq '.aggregate'

# If acceptable, this becomes the new baseline when merged to main
```

**3. Update thresholds if needed:**
- Edit `.github/performance-thresholds.json`
- Document changes in commit message
- Consider if thresholds should be tighter or looser

## Common Performance Issues

### Issue: Low FPS with Low GPU Usage
**Cause:** CPU-bound (JavaScript execution)
**Fix:** Profile with DevTools, optimize hot paths, reduce allocations

### Issue: Low FPS with High GPU Usage
**Cause:** GPU-bound (too much geometry or overdraw)
**Fix:** Reduce draw calls, improve LOD/culling, simplify shaders

### Issue: FPS Drops Over Time
**Cause:** Memory leak or unbounded growth
**Fix:** Profile memory with DevTools, check for detached nodes, fix leaks

### Issue: Erratic FPS with Spikes
**Cause:** Garbage collection pauses
**Fix:** Reduce allocations, use object pooling, profile GC activity

### Issue: High Worker Backlog
**Cause:** Simulation too complex or worker overloaded
**Fix:** Optimize simulation logic, reduce entity count, or increase worker capacity

### Issue: High Meshing Queue
**Cause:** Too many chunks being generated
**Fix:** Reduce view distance, implement chunk priority, throttle generation

## Best Practices

1. **Profile Before Optimizing**
   - Use telemetry panel to identify actual bottlenecks
   - Don't optimize based on assumptions

2. **Test on Target Hardware**
   - CI runs on consistent hardware
   - Test on lower-end devices if targeting them

3. **Maintain Baselines**
   - Update baselines when making intentional changes
   - Keep historical baselines for comparison

4. **Monitor Trends**
   - Track metrics over time
   - Look for gradual degradation (death by a thousand cuts)

5. **Document Performance Decisions**
   - Explain trade-offs in commit messages
   - Note when accepting performance cost for features

6. **Set Realistic Goals**
   - Target 60 FPS on reasonable hardware
   - Accept some variation in complex scenes
   - Balance quality vs. performance

## Resources

- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/Performance)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Worker Performance Best Practices](https://web.dev/workers-overview/)

## Troubleshooting

**Q: Telemetry panel doesn't show up**
A: Ensure you added `?telemetry=true` to the URL and the page is loaded

**Q: Metrics seem wrong or inconsistent**
A: Wait a few seconds for metrics to stabilize; early samples can be noisy

**Q: CI fails but local testing is fine**
A: CI runs headless and may have different performance characteristics; download the CI metrics artifact and compare

**Q: How often should I run baselines?**
A: Run locally when making performance-sensitive changes; CI runs automatically on every PR

**Q: Can I skip CI performance checks?**
A: Use `PERF_WARNING_ONLY=true` temporarily, but address issues before merging
