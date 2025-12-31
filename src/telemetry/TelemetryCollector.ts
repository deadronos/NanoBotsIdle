/**
 * TelemetryCollector - Collects runtime performance metrics
 * 
 * Tracks:
 * - FPS (frames per second)
 * - Frame time (ms per frame)
 * - Meshing time per chunk
 * - Worker queue lengths
 * - Meshing queue wait times
 */

export type TelemetrySnapshot = {
  timestamp: number;
  fps: {
    current: number;
    avg: number;
    min: number;
    max: number;
  };
  frameTime: {
    current: number;
    avg: number;
    min: number;
    max: number;
  };
  meshing: {
    avgTimePerChunk: number;
    totalChunks: number;
    queueLength: number;
    inFlight: number;
    avgWaitTime: number;
  };
  worker: {
    simMs: number;
    backlog: number;
  };
};

type Sample = {
  value: number;
  timestamp: number;
};

export class TelemetryCollector {
  private enabled = false;

  // FPS tracking
  private fpsHistory: Sample[] = [];
  private lastFpsUpdate = 0;
  private currentFps = 60;

  // Frame time tracking
  private frameTimeHistory: Sample[] = [];
  private lastFrameTime = 0;

  // Meshing tracking
  private meshingTimes: Sample[] = [];
  private totalChunksMeshed = 0;
  private meshingQueueLength = 0;
  private meshingInFlight = 0;
  private meshingWaitTimes: Sample[] = [];

  // Worker tracking
  private workerSimMs = 0;
  private workerBacklog = 0;

  // Config
  private readonly maxHistorySize = 120; // ~2 seconds at 60fps
  private readonly maxMeshingHistory = 100;

  constructor(enabled = false) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset() {
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.meshingTimes = [];
    this.meshingWaitTimes = [];
    this.totalChunksMeshed = 0;
    this.meshingQueueLength = 0;
    this.meshingInFlight = 0;
    this.workerSimMs = 0;
    this.workerBacklog = 0;
  }

  recordFps(fps: number) {
    if (!this.enabled) return;
    const now = performance.now();
    this.currentFps = fps;
    this.lastFpsUpdate = now;
    this.fpsHistory.push({ value: fps, timestamp: now });
    this.trimHistory(this.fpsHistory);
  }

  recordFrameTime(frameTime: number) {
    if (!this.enabled) return;
    const now = performance.now();
    this.lastFrameTime = frameTime;
    this.frameTimeHistory.push({ value: frameTime, timestamp: now });
    this.trimHistory(this.frameTimeHistory);
  }

  recordMeshingTime(timeMs: number) {
    if (!this.enabled) return;
    const now = performance.now();
    this.meshingTimes.push({ value: timeMs, timestamp: now });
    this.totalChunksMeshed++;
    if (this.meshingTimes.length > this.maxMeshingHistory) {
      this.meshingTimes.shift();
    }
  }

  recordMeshingQueue(queueLength: number, inFlight: number) {
    if (!this.enabled) return;
    this.meshingQueueLength = queueLength;
    this.meshingInFlight = inFlight;
  }

  recordMeshingWaitTime(waitTimeMs: number) {
    if (!this.enabled) return;
    const now = performance.now();
    this.meshingWaitTimes.push({ value: waitTimeMs, timestamp: now });
    if (this.meshingWaitTimes.length > this.maxMeshingHistory) {
      this.meshingWaitTimes.shift();
    }
  }

  recordWorkerStats(simMs: number, backlog: number) {
    if (!this.enabled) return;
    this.workerSimMs = simMs;
    this.workerBacklog = backlog;
  }

  private trimHistory(history: Sample[]) {
    while (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  private computeStats(history: Sample[]): { avg: number; min: number; max: number } {
    if (history.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }
    const values = history.map((s) => s.value);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  getSnapshot(): TelemetrySnapshot {
    const fpsStats = this.computeStats(this.fpsHistory);
    const frameTimeStats = this.computeStats(this.frameTimeHistory);
    const meshingStats = this.computeStats(this.meshingTimes);
    const waitTimeStats = this.computeStats(this.meshingWaitTimes);

    return {
      timestamp: performance.now(),
      fps: {
        current: this.currentFps,
        ...fpsStats,
      },
      frameTime: {
        current: this.lastFrameTime,
        ...frameTimeStats,
      },
      meshing: {
        avgTimePerChunk: meshingStats.avg,
        totalChunks: this.totalChunksMeshed,
        queueLength: this.meshingQueueLength,
        inFlight: this.meshingInFlight,
        avgWaitTime: waitTimeStats.avg,
      },
      worker: {
        simMs: this.workerSimMs,
        backlog: this.workerBacklog,
      },
    };
  }

  exportJSON(): string {
    return JSON.stringify(this.getSnapshot(), null, 2);
  }
}

// Singleton instance
let telemetryInstance: TelemetryCollector | null = null;

export const getTelemetryCollector = (): TelemetryCollector => {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryCollector(false);
  }
  return telemetryInstance;
};

export const resetTelemetryCollector = () => {
  telemetryInstance = null;
};
