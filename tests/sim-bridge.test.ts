import { afterEach, describe, expect, it, vi } from "vitest";

import type { FromWorker, ToWorker } from "../src/shared/protocol";
import { createSimBridge } from "../src/simBridge/simBridge";
import { useUiStore } from "../src/ui/store";

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

describe("sim bridge gating", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("allows only one STEP in flight", () => {
    const worker = new FakeWorker();
    const bridge = createSimBridge({ workerFactory: () => worker, onError: () => undefined });

    bridge.step(1000);

    const stepCountAfterFirst = worker.messages.filter((msg) => msg.t === "STEP").length;
    expect(stepCountAfterFirst).toBe(1);

    bridge.step(1016);
    const stepCountAfterSecond = worker.messages.filter((msg) => msg.t === "STEP").length;
    expect(stepCountAfterSecond).toBe(1);

    worker.emit({
      t: "FRAME",
      frameId: 0,
      delta: { tick: 0 },
      ui: {
        credits: 0,
        creditsPerMinute: 0,
        cargoInTransit: 0,
        prestigeLevel: 1,
        droneCount: 0,
        haulerCount: 0,
        miningSpeedLevel: 1,
        moveSpeedLevel: 1,
        laserPowerLevel: 1,
        minedBlocks: 0,
        totalBlocks: 0,

        outposts: [],
      },
      stats: { simMs: 0, backlog: 0 },
    });

    bridge.step(1032);
    const stepCountAfterThird = worker.messages.filter((msg) => msg.t === "STEP").length;
    expect(stepCountAfterThird).toBe(2);
  });

  it("keeps the worker alive and resets the clock on the first step after pause", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const worker = new FakeWorker();
    const bridge = createSimBridge({ workerFactory: () => worker, onError: () => undefined });
    bridge.start();
    bridge.step(1_000);
    const frame = {
      t: "FRAME",
      frameId: 0,
      delta: { tick: 1 },
      ui: useUiStore.getInitialState().snapshot,
    } satisfies FromWorker;
    worker.emit(frame);
    bridge.pause();

    expect(bridge.isRunning()).toBe(false);
    expect(worker.terminated).toBe(false);
    expect(bridge.getLastFrame()).toBe(frame);
    bridge.start();
    bridge.step(65_000);

    expect(worker.messages.map(({ t }) => t)).toEqual(["INIT", "STEP", "STEP"]);
    expect(worker.messages.at(-1)).toMatchObject({ t: "STEP", resetClock: true });

    bridge.stop();
    expect(worker.terminated).toBe(true);
  });

  it("stops stepping after worker error", () => {
    const worker = new FakeWorker();
    const bridge = createSimBridge({
      workerFactory: () => worker,
      onError: () => undefined,
      maxRetries: 1,
    });

    bridge.step(1000);
    worker.emit({ t: "ERROR", message: "boom" });

    bridge.step(1016);
    const stepCount = worker.messages.filter((msg) => msg.t === "STEP").length;
    expect(stepCount).toBe(1);
  });
});
