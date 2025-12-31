import { describe, expect, it } from "vitest";

import type { FromWorker, ToWorker } from "../src/shared/protocol";
import { createSimBridge } from "../src/simBridge/simBridge";

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

    bridge.step(1032);
    const stepCountAfterThird = worker.messages.filter((msg) => msg.t === "STEP").length;
    expect(stepCountAfterThird).toBe(2);
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
