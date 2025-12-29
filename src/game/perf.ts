export type PerfMetric = "frameMs" | "simMs" | "lightMs" | "meshBuildMs" | "meshSwapMs";

type MetricTotals = Record<PerfMetric, { total: number; max: number }>;

export type PerfSnapshot = {
  count: number;
  averageMs: Record<PerfMetric, number>;
  maxMs: Record<PerfMetric, number>;
};

export class PerfStats {
  enabled = false;
  count = 0;
  private totals: MetricTotals = createTotals();

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  reset(): void {
    this.count = 0;
    this.totals = createTotals();
  }

  add(metric: PerfMetric, valueMs: number): void {
    if (!this.enabled) return;
    const entry = this.totals[metric];
    entry.total += valueMs;
    if (valueMs > entry.max) entry.max = valueMs;
  }

  recordFrame(valueMs: number): void {
    if (!this.enabled) return;
    this.count += 1;
    this.add("frameMs", valueMs);
  }

  snapshot(): PerfSnapshot {
    const averageMs = {} as Record<PerfMetric, number>;
    const maxMs = {} as Record<PerfMetric, number>;
    const denom = Math.max(1, this.count);

    for (const metric of Object.keys(this.totals) as PerfMetric[]) {
      const entry = this.totals[metric];
      averageMs[metric] = entry.total / denom;
      maxMs[metric] = entry.max;
    }

    return { count: this.count, averageMs, maxMs };
  }
}

function createTotals(): MetricTotals {
  return {
    frameMs: { total: 0, max: 0 },
    simMs: { total: 0, max: 0 },
    lightMs: { total: 0, max: 0 },
    meshBuildMs: { total: 0, max: 0 },
    meshSwapMs: { total: 0, max: 0 },
  };
}

export const perfStats = new PerfStats();

declare global {
  interface Window {
    __nanobotsPerf?: PerfStats;
  }
}

if (typeof window !== "undefined") {
  window.__nanobotsPerf = perfStats;
}
