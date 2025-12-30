/**
 * Memory tracking utility for detecting leaks and unbounded growth.
 * 
 * Usage:
 * 1. Create a tracker: `const tracker = new MemoryTracker()`
 * 2. Record snapshots: `tracker.snapshot('label')`
 * 3. Compare: `tracker.compare('before', 'after')`
 * 4. Get report: `tracker.report()`
 */

export interface MemorySnapshot {
  label: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryDelta {
  heapUsedDelta: number;
  heapTotalDelta: number;
  externalDelta: number;
  arrayBuffersDelta: number;
  durationMs: number;
}

export class MemoryTracker {
  private snapshots: Map<string, MemorySnapshot> = new Map();

  /**
   * Take a memory snapshot with the given label.
   */
  snapshot(label: string): MemorySnapshot {
    // Force garbage collection if available (requires --expose-gc flag)
    if (global.gc) {
      global.gc();
    }

    const memUsage = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      label,
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    };

    this.snapshots.set(label, snapshot);
    return snapshot;
  }

  /**
   * Get a snapshot by label.
   */
  getSnapshot(label: string): MemorySnapshot | undefined {
    return this.snapshots.get(label);
  }

  /**
   * Compare two snapshots and return the delta.
   */
  compare(beforeLabel: string, afterLabel: string): MemoryDelta | null {
    const before = this.snapshots.get(beforeLabel);
    const after = this.snapshots.get(afterLabel);

    if (!before || !after) {
      return null;
    }

    return {
      heapUsedDelta: after.heapUsed - before.heapUsed,
      heapTotalDelta: after.heapTotal - before.heapTotal,
      externalDelta: after.external - before.external,
      arrayBuffersDelta: after.arrayBuffers - before.arrayBuffers,
      durationMs: after.timestamp - before.timestamp,
    };
  }

  /**
   * Generate a full report of all snapshots.
   */
  report(): string {
    const lines: string[] = [];
    lines.push("Memory Tracker Report");
    lines.push("=".repeat(60));
    lines.push("");

    const sortedSnapshots = Array.from(this.snapshots.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (let i = 0; i < sortedSnapshots.length; i++) {
      const snapshot = sortedSnapshots[i]!;
      lines.push(`[${i}] ${snapshot.label}`);
      lines.push(`    Timestamp: ${new Date(snapshot.timestamp).toISOString()}`);
      lines.push(`    Heap Used: ${this.formatBytes(snapshot.heapUsed)}`);
      lines.push(`    Heap Total: ${this.formatBytes(snapshot.heapTotal)}`);
      lines.push(`    External: ${this.formatBytes(snapshot.external)}`);
      lines.push(`    Array Buffers: ${this.formatBytes(snapshot.arrayBuffers)}`);

      if (i > 0) {
        const prev = sortedSnapshots[i - 1]!;
        const delta = {
          heapUsedDelta: snapshot.heapUsed - prev.heapUsed,
          heapTotalDelta: snapshot.heapTotal - prev.heapTotal,
          externalDelta: snapshot.external - prev.external,
          arrayBuffersDelta: snapshot.arrayBuffers - prev.arrayBuffers,
          durationMs: snapshot.timestamp - prev.timestamp,
        };

        lines.push(`    Delta from [${i - 1}]:`);
        lines.push(
          `      Heap Used: ${this.formatBytesDelta(delta.heapUsedDelta)} (${this.formatPercent(delta.heapUsedDelta, prev.heapUsed)})`,
        );
        lines.push(
          `      Array Buffers: ${this.formatBytesDelta(delta.arrayBuffersDelta)} (${this.formatPercent(delta.arrayBuffersDelta, prev.arrayBuffers)})`,
        );
        lines.push(`      Duration: ${delta.durationMs}ms`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Clear all snapshots.
   */
  clear(): void {
    this.snapshots.clear();
  }

  private formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
  }

  private formatBytesDelta(bytes: number): string {
    const sign = bytes >= 0 ? "+" : "";
    const mb = bytes / 1024 / 1024;
    return `${sign}${mb.toFixed(2)} MB`;
  }

  private formatPercent(delta: number, base: number): string {
    if (base === 0) return "N/A";
    const percent = (delta / base) * 100;
    const sign = percent >= 0 ? "+" : "";
    return `${sign}${percent.toFixed(1)}%`;
  }
}

/**
 * Helper to detect memory leaks by running a function repeatedly
 * and tracking memory growth.
 */
export async function detectLeak(options: {
  fn: () => void | Promise<void>;
  iterations: number;
  snapshotInterval?: number;
  gcBetweenIterations?: boolean;
}): Promise<{
  leaked: boolean;
  report: string;
  growthRate: number;
}> {
  const { fn, iterations, snapshotInterval = 10, gcBetweenIterations = true } = options;

  const tracker = new MemoryTracker();
  tracker.snapshot("start");

  for (let i = 0; i < iterations; i++) {
    await fn();

    if (gcBetweenIterations && global.gc) {
      global.gc();
    }

    if ((i + 1) % snapshotInterval === 0) {
      tracker.snapshot(`iteration-${i + 1}`);
    }
  }

  tracker.snapshot("end");

  const start = tracker.getSnapshot("start")!;
  const end = tracker.getSnapshot("end")!;

  const growthBytes = end.heapUsed - start.heapUsed;
  const growthRate = growthBytes / iterations; // bytes per iteration

  // Consider it a leak if growth rate is > 1KB per iteration
  const leaked = growthRate > 1024;

  const report = tracker.report();

  return {
    leaked,
    report,
    growthRate,
  };
}
