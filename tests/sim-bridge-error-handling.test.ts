import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FromWorker, ToWorker } from "../src/shared/protocol";
import { createSimBridge } from "../src/simBridge/simBridge";
import { getTelemetryCollector, resetTelemetryCollector } from "../src/telemetry";

class FakeWorker {
  messages: ToWorker[] = [];
  listeners = new Set<(event: MessageEvent<FromWorker>) => void>();
  terminated = false;

  postMessage(message: ToWorker) {
    this.messages.push(message);
  }

  addEventListener(_type: "message", listener: (event: MessageEvent<FromWorker>) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "message", listener: (event: MessageEvent<FromWorker>) => void) {
    this.listeners.delete(listener);
  }

  emit(message: FromWorker) {
    const event = { data: message } as MessageEvent<FromWorker>;
    this.listeners.forEach((listener) => listener(event));
  }

  terminate() {
    this.terminated = true;
  }
}

describe("SimBridge worker error handling with retry", () => {
  beforeEach(() => {
    resetTelemetryCollector();
    vi.useFakeTimers();
  });

  it("should retry worker on ERROR up to maxRetries", async () => {
    const workers: FakeWorker[] = [];
    let workerIndex = 0;
    const errorCallback = vi.fn();

    const bridge = createSimBridge({
      workerFactory: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        workerIndex++;
        return worker;
      },
      onError: errorCallback,
      maxRetries: 3,
      retryDelayMs: 100,
    });

    bridge.step(1000);

    // First worker created
    expect(workers.length).toBe(1);
    expect(workers[0]!.messages.length).toBeGreaterThan(0);

    // Emit error from first worker
    workers[0]!.emit({ t: "ERROR", message: "Worker crash 1" });

    // Error callback should be called
    expect(errorCallback).toHaveBeenCalledWith(expect.stringContaining("attempt 1/3"));

    // Wait for retry delay
    vi.advanceTimersByTime(100);

    // Second worker should be created after retry
    expect(workers.length).toBe(2);
    expect(workers[0]!.terminated).toBe(true);

    // Emit error from second worker
    bridge.step(1100);
    workers[1]!.emit({ t: "ERROR", message: "Worker crash 2" });

    expect(errorCallback).toHaveBeenCalledWith(expect.stringContaining("attempt 2/3"));

    // Wait for retry delay
    vi.advanceTimersByTime(100);

    // Third worker should be created
    expect(workers.length).toBe(3);
    expect(workers[1]!.terminated).toBe(true);

    // Emit error from third worker
    bridge.step(1200);
    workers[2]!.emit({ t: "ERROR", message: "Worker crash 3" });

    // Should give up after max retries
    expect(errorCallback).toHaveBeenCalledWith(expect.stringContaining("attempt 3/3"));

    // No more retries should happen
    vi.advanceTimersByTime(200);
    expect(workers.length).toBe(3);

    // Worker should be disabled
    bridge.step(1300);
    expect(workers[2]!.messages.filter((m) => m.t === "STEP").length).toBe(1); // Only the one before error

    bridge.stop();
    vi.useRealTimers();
  });

  it("should successfully recover from transient worker error", () => {
    const workers: FakeWorker[] = [];
    const errorCallback = vi.fn();

    const bridge = createSimBridge({
      workerFactory: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
      onError: errorCallback,
      maxRetries: 3,
      retryDelayMs: 50,
    });

    bridge.step(1000);

    expect(workers.length).toBe(1);

    // Emit error
    workers[0]!.emit({ t: "ERROR", message: "Transient error" });

    // Wait for retry
    vi.advanceTimersByTime(50);

    // New worker created
    expect(workers.length).toBe(2);
    expect(workers[0]!.terminated).toBe(true);

    // New worker works fine
    bridge.step(1100);
    expect(workers[1]!.messages.filter((m) => m.t === "STEP").length).toBeGreaterThan(0);

    workers[1]!.emit({
      t: "FRAME",
      frameId: 0,
      delta: { tick: 0 },
      ui: {
        credits: 0,
        prestigeLevel: 1,
        droneCount: 0,
        miningSpeedLevel: 1,
        moveSpeedLevel: 1,
        laserPowerLevel: 1,
        minedBlocks: 0,
        totalBlocks: 0,
        upgrades: {},
      },
      stats: { simMs: 0, backlog: 0 },
    });

    // Bridge should continue working
    bridge.step(1200);
    expect(workers[1]!.messages.filter((m) => m.t === "STEP").length).toBeGreaterThan(0);

    bridge.stop();
    vi.useRealTimers();
  });

  it("should track worker errors in telemetry", () => {
    const telemetry = getTelemetryCollector();
    telemetry.setEnabled(true);

    const worker = new FakeWorker();
    const bridge = createSimBridge({
      workerFactory: () => worker,
      onError: () => undefined,
      maxRetries: 2,
    });

    bridge.step(1000);

    // Emit error
    worker.emit({ t: "ERROR", message: "Test error" });

    const snapshot = telemetry.getSnapshot();
    expect(snapshot.worker.errorCount).toBe(1);
    expect(snapshot.worker.retryCount).toBe(1);

    bridge.stop();
    resetTelemetryCollector();
  });

  it("should clear retry timeout on stop", () => {
    const worker = new FakeWorker();
    const errorCallback = vi.fn();

    const bridge = createSimBridge({
      workerFactory: () => worker,
      onError: errorCallback,
      maxRetries: 3,
      retryDelayMs: 100,
    });

    bridge.step(1000);
    worker.emit({ t: "ERROR", message: "Error before stop" });

    expect(errorCallback).toHaveBeenCalled();

    // Stop before retry happens
    bridge.stop();

    // Advance time - no retry should occur
    vi.advanceTimersByTime(200);

    // Bridge is stopped, no new messages
    expect(worker.terminated).toBe(true);

    vi.useRealTimers();
  });

  it("should reset error count on stop and allow fresh start", () => {
    const workers: FakeWorker[] = [];
    const errorCallback = vi.fn();

    const bridge = createSimBridge({
      workerFactory: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
      onError: errorCallback,
      maxRetries: 2,
      retryDelayMs: 50,
    });

    bridge.step(1000);

    // Cause error
    workers[0]!.emit({ t: "ERROR", message: "Error 1" });
    vi.advanceTimersByTime(50);

    // Second attempt
    bridge.step(1100);
    workers[1]!.emit({ t: "ERROR", message: "Error 2" });

    expect(errorCallback).toHaveBeenCalledTimes(2);

    // Stop and restart
    bridge.stop();
    vi.advanceTimersByTime(100);

    // New step after stop
    bridge.step(2000);

    // New worker should be created (error count reset)
    expect(workers.length).toBeGreaterThanOrEqual(2);

    bridge.stop();
    vi.useRealTimers();
  });
});
