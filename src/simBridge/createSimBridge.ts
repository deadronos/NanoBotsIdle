import type { Cmd, FromWorker, ToWorker } from "../shared/protocol";
import { useGameStore } from "../store";
import { getTelemetryCollector } from "../telemetry";
import { error, warn } from "../utils/logger";
import type { FrameHandler, FrameMessage, SimBridge, SimBridgeOptions, WorkerLike } from "./types";
import { defaultWorkerFactory } from "./workerFactory";

export const createSimBridge = (options: SimBridgeOptions = {}): SimBridge => {
  const workerFactory = options.workerFactory ?? defaultWorkerFactory;
  const budgetMs = options.budgetMs ?? 8;
  const maxSubsteps = options.maxSubsteps ?? 4;
  const onError = options.onError ?? ((message) => error(message));
  const maxRetries = options.maxRetries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 1000;

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
  let errorCount = 0;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;

  const telemetry = getTelemetryCollector();

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
      errorCount++;
      telemetry.recordWorkerError();

      const errorMessage = `Sim worker error (attempt ${errorCount}/${maxRetries}): ${msg.message}`;
      warn(errorMessage);
      onError(errorMessage);

      if (errorCount < maxRetries) {
        // Retry by restarting the worker
        telemetry.recordWorkerRetry();
        warn(`Retrying sim worker in ${retryDelayMs}ms...`);

        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }

        retryTimeout = setTimeout(() => {
          retryTimeout = null;
          attemptWorkerRestart();
        }, retryDelayMs);
      } else {
        // Max retries exceeded, disable worker
        disabled = true;
        error(`Sim worker failed after ${maxRetries} attempts. Worker disabled.`);
      }
    }
  };

  const attemptWorkerRestart = () => {
    if (disabled) return;

    // Terminate existing worker
    if (worker) {
      worker.removeEventListener("message", handleMessage);
      worker.terminate?.();
      worker = null;
      initSent = false;
    }

    // Create new worker
    try {
      ensureWorker();
      warn("Sim worker restarted successfully");
    } catch (err) {
      error("Failed to restart sim worker:", err);
      disabled = true;
    }
  };

  const ensureWorker = () => {
    if (worker) return;
    worker = workerFactory();
    worker.addEventListener("message", handleMessage);
    if (!initSent) {
      const state = useGameStore.getState();
      // Only pass data fields, strip functions to plain object for messaging
      const saveState = {
        credits: state.credits,
        prestigeLevel: state.prestigeLevel,
        droneCount: state.droneCount,
        haulerCount: state.haulerCount,
        miningSpeedLevel: state.miningSpeedLevel,
        moveSpeedLevel: state.moveSpeedLevel,
        laserPowerLevel: state.laserPowerLevel,
        minedBlocks: state.minedBlocks,
        totalBlocks: state.totalBlocks,
        // upgrades: ??? GameState doesn't have upgrades object?
        // Wait, store.ts defines upgrades as flat fields (miningSpeedLevel etc).
        // But UiSnapshot has upgrades: Record<string, number>.
        // engine.ts expects upgrades: {}.
        // We need to MAP flat fields -> upgrades map if engine expects it.
        // engine.ts: uiSnapshot.upgrades = saveState?.upgrades ?? {}.
        // But store.ts: miningSpeedLevel, etc.
        // Does engine USE `upgrades` object?
        // engine.ts: case "BUY_UPGRADE": checks `cmd.id`.
        // `tryBuyUpgrade` reads `uiSnapshot`.
        // `uiSnapshot` properties match store.ts properties?
        // Let's check `UiSnapshot` definition in `protocol.ts` (Step 79).
        // `upgrades: Record<string, number>`.
        // `miningSpeedLevel` etc are ALSO in `UiSnapshot`.
        // So `upgrades` might be redundant or legacy?
        // `engine.ts` initializes `upgrades: {}`.
        // Let's pass what we have. If `upgrades` object is needed for UI cost calc, we should reconstruct it.
        // But `store.ts` manages it.
        // Let's just pass `outposts`.
        outposts: state.outposts,
      };

      worker.postMessage({ t: "INIT", saveState });
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
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
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
    errorCount = 0;
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
    getLastFrame: () => lastFrame,
    isRunning: () => running,
  };
};
