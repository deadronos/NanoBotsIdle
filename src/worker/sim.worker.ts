/// <reference lib="webworker" />

import { createEngine } from "../engine/engine";
import type { FromWorker, ToWorker } from "../shared/protocol";

const scope = self as DedicatedWorkerGlobalScope;

let engine = createEngine();
let lastNowMs = 0;

const send = (message: FromWorker) => {
  scope.postMessage(message);
};

scope.addEventListener("message", (event: MessageEvent<ToWorker>) => {
  try {
    const msg = event.data;
    switch (msg.t) {
      case "INIT": {
        engine = createEngine(msg.seed);
        lastNowMs = 0;
        send({ t: "READY" });
        return;
      }
      case "STEP": {
        for (const cmd of msg.cmds) {
          engine.dispatch(cmd);
        }

        const dtSeconds = lastNowMs > 0 ? (msg.nowMs - lastNowMs) / 1000 : 0;
        lastNowMs = msg.nowMs;

        const start = performance.now();
        const { delta, ui, backlog } = engine.tick(dtSeconds, msg.budgetMs, msg.maxSubsteps);
        const simMs = performance.now() - start;

        send({
          t: "FRAME",
          frameId: msg.frameId,
          delta,
          ui,
          stats: { simMs, backlog },
        });
        return;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker error";
    send({ t: "ERROR", message });
  }
});
