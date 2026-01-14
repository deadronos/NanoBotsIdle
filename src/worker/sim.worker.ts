/// <reference lib="webworker" />

import { createEngine } from "../engine/engine";
import type { FromWorker, ToWorker } from "../shared/protocol";
import { ToWorkerSchema } from "../shared/schemas";

const scope = self as DedicatedWorkerGlobalScope;

let engine = createEngine();
let lastNowMs = 0;

const send = (message: FromWorker) => {
  // If FRAME messages contain large TypedArrays (entities, targets, etc.), transfer
  // their underlying ArrayBuffers to avoid a costly structured-clone on the main thread.
  if (message.t === "FRAME") {
    const transfer: ArrayBuffer[] = [];
    const delta = message.delta;

    // Look for common typed-array fields and transfer their buffers when present
    const tryAdd = (v: unknown) => {
      if (v && typeof v === "object") {
        // Float32Array / Uint8Array / etc.
        if (
          v instanceof Float32Array ||
          v instanceof Uint8Array ||
          v instanceof Int32Array ||
          v instanceof Uint32Array ||
          v instanceof Uint8ClampedArray
        ) {
          const buffer = (v as ArrayBufferView).buffer;
          // Only transfer ArrayBuffer (not SharedArrayBuffer)
          if (buffer instanceof ArrayBuffer) {
            transfer.push(buffer);
          }
        }
      }
    };

    tryAdd(delta.entities);
    tryAdd(delta.entityTargets);
    tryAdd(delta.entityStates);
    tryAdd(delta.entityRoles);
    tryAdd(delta.minedPositions);
    tryAdd(delta.frontierAdd);
    tryAdd(delta.frontierRemove);

    if (transfer.length > 0) {
      scope.postMessage(message, transfer);
      return;
    }
  }

  scope.postMessage(message);
};

scope.addEventListener("message", (event: MessageEvent<ToWorker>) => {
  try {
    const parse = ToWorkerSchema.safeParse(event.data);
    if (!parse.success) {
      throw new Error(`Worker received invalid message: ${parse.error.message}`);
    }
    const msg = parse.data;
    switch (msg.t) {
      case "INIT": {
        engine = createEngine(msg.seed, msg.saveState);
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
