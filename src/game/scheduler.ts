export type ScheduledTask = {
  id: string;
  run: () => void;
  priority?: number;
  onComplete?: (durationMs: number) => void;
};

type SchedulerOptions = {
  defaultEstimateMs?: number;
  smoothing?: number;
};

export class FrameBudgetScheduler {
  private tasks: ScheduledTask[] = [];
  private estimates = new Map<string, number>();
  private defaultEstimateMs: number;
  private smoothing: number;
  private budgetMs = 0;

  constructor(options?: SchedulerOptions) {
    this.defaultEstimateMs = options?.defaultEstimateMs ?? 0.25;
    this.smoothing = options?.smoothing ?? 0.2;
  }

  beginFrame(budgetMs: number): void {
    this.tasks = [];
    this.budgetMs = Math.max(0, budgetMs);
  }

  schedule(task: ScheduledTask): void {
    this.tasks.push(task);
  }

  run(): void {
    if (this.tasks.length === 0 || this.budgetMs <= 0) return;
    const tasks = [...this.tasks].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );
    let remaining = this.budgetMs;
    let ranAny = false;

    for (const task of tasks) {
      const estimate = this.estimates.get(task.id) ?? this.defaultEstimateMs;
      if (remaining < estimate && ranAny) break;
      const start = performance.now();
      task.run();
      const duration = performance.now() - start;
      const nextEstimate = blend(estimate, duration, this.smoothing);
      this.estimates.set(task.id, nextEstimate);
      task.onComplete?.(duration);
      remaining -= duration;
      ranAny = true;
    }
  }
}

function blend(prev: number, next: number, smoothing: number): number {
  return prev * (1 - smoothing) + next * smoothing;
}
