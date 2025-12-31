import { beforeEach, describe, expect, it } from "vitest";

import { TelemetryCollector } from "../src/telemetry/TelemetryCollector";

describe("TelemetryCollector", () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    collector = new TelemetryCollector(true);
  });

  it("should collect FPS metrics", () => {
    collector.recordFps(60);
    collector.recordFps(59);
    collector.recordFps(61);

    const snapshot = collector.getSnapshot();
    expect(snapshot.fps.current).toBe(61);
    expect(snapshot.fps.avg).toBeCloseTo(60, 0);
    expect(snapshot.fps.min).toBe(59);
    expect(snapshot.fps.max).toBe(61);
  });

  it("should collect frame time metrics", () => {
    collector.recordFrameTime(16.6);
    collector.recordFrameTime(16.8);
    collector.recordFrameTime(16.4);

    const snapshot = collector.getSnapshot();
    expect(snapshot.frameTime.current).toBe(16.4);
    expect(snapshot.frameTime.avg).toBeCloseTo(16.6, 0);
  });

  it("should collect meshing metrics", () => {
    collector.recordMeshingTime(5.2);
    collector.recordMeshingTime(4.8);
    collector.recordMeshingTime(5.0);

    const snapshot = collector.getSnapshot();
    expect(snapshot.meshing.totalChunks).toBe(3);
    expect(snapshot.meshing.avgTimePerChunk).toBeCloseTo(5.0, 0);
  });

  it("should record meshing queue state", () => {
    collector.recordMeshingQueue(10, 2);

    const snapshot = collector.getSnapshot();
    expect(snapshot.meshing.queueLength).toBe(10);
    expect(snapshot.meshing.inFlight).toBe(2);
  });

  it("should record worker stats", () => {
    collector.recordWorkerStats(8.5, 3);

    const snapshot = collector.getSnapshot();
    expect(snapshot.worker.simMs).toBe(8.5);
    expect(snapshot.worker.backlog).toBe(3);
  });

  it("should not collect metrics when disabled", () => {
    const disabledCollector = new TelemetryCollector(false);
    disabledCollector.recordFps(60);
    disabledCollector.recordFrameTime(16.6);

    const snapshot = disabledCollector.getSnapshot();
    expect(snapshot.fps.avg).toBe(0);
    expect(snapshot.frameTime.avg).toBe(0);
  });

  it("should export JSON snapshot", () => {
    collector.recordFps(60);
    collector.recordWorkerStats(8.0, 2);

    const json = collector.exportJSON();
    const parsed = JSON.parse(json);

    expect(parsed.fps.current).toBe(60);
    expect(parsed.worker.simMs).toBe(8.0);
  });

  it("should reset all metrics", () => {
    collector.recordFps(60);
    collector.recordFrameTime(16.6);
    collector.recordMeshingTime(5.0);

    collector.reset();

    const snapshot = collector.getSnapshot();
    expect(snapshot.fps.avg).toBe(0);
    expect(snapshot.frameTime.avg).toBe(0);
    expect(snapshot.meshing.totalChunks).toBe(0);
  });

  it("should trim history to maxHistorySize", () => {
    // Record more than maxHistorySize samples (120)
    for (let i = 0; i < 150; i++) {
      collector.recordFps(60);
    }

    const snapshot = collector.getSnapshot();
    // Should have trimmed to maxHistorySize, but still computing stats
    expect(snapshot.fps.avg).toBe(60);
  });
});
