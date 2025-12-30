import type { Cmd, FromWorker, ToWorker } from "../shared/protocol";
import { error } from "../utils/logger";
import type { FrameHandler, FrameMessage, SimBridge, SimBridgeOptions, WorkerLike } from "./types";
import { defaultWorkerFactory } from "./workerFactory";

export const createSimBridge = (options: SimBridgeOptions = {}): SimBridge => {
  const workerFactory = options.workerFactory ?? defaultWorkerFactory;
  const budgetMs = options.budgetMs ?? 8;
  const maxSubsteps = options.maxSubsteps ?? 4;
  const onError = options.onError ?? ((message) => error(message));

  let worker: WorkerLike | null = null;
  let running = false;
  let rafId: number | null = null;
  let initSent = false;
  let stepInFlight = false;
  let disabled = false;
  let frameId = 0;
  let cmdQueue: Cmd[] = [];
  const frameHandlers = new Set<FrameHandler>();
  let lastFrame: FrameMessage | null = null;

  const handleMessage = (event: MessageEvent<FromWorker>) => {
    const msg = event.data;
    if (msg.t === "FRAME") {
      stepInFlight = false;
      lastFrame = msg;
      frameHandlers.forEach((handler) => handler(msg));
      return;
    }

    if (msg.t === "ERROR") {
      stepInFlight = false;
      disabled = true;
      onError(`Sim worker error: ${msg.message}`);
    }
  };

  const ensureWorker = () => {
    if (worker) return;
    worker = workerFactory();
    worker.addEventListener("message", handleMessage);
    if (!initSent) {
      worker.postMessage({ t: "INIT" });
      initSent = true;
    }
  };

  const step = (nowMs: number) => {
    if (disabled) return;
    ensureWorker();
    if (!worker || stepInFlight) return;

    const cmds = cmdQueue;
    cmdQueue = [];
    const message: ToWorker = {
      t: "STEP",
      frameId,
      nowMs,
      budgetMs,
      maxSubsteps,
      cmds,
    };
    frameId += 1;
    stepInFlight = true;
    worker.postMessage(message);
  };

  const loop = (nowMs: number) => {
    if (!running) return;
    step(nowMs);
    rafId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running) return;
    running = true;
    ensureWorker();
    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (worker) {
      worker.removeEventListener("message", handleMessage);
      worker.terminate?.();
      worker = null;
    }
    stepInFlight = false;
    disabled = false;
    initSent = false;
    lastFrame = null;
  };

  const enqueue = (cmd: Cmd) => {
    cmdQueue.push(cmd);
  };

  const onFrame = (handler: FrameHandler) => {
    frameHandlers.add(handler);
    if (lastFrame) {
      handler(lastFrame);
    }
    return () => {
      frameHandlers.delete(handler);
    };
  };

  return {
    start,
    stop,
    step,
    enqueue,
    onFrame,
    isRunning: () => running,
  };
};
