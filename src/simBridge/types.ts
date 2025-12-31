import type { Cmd, FromWorker } from "../shared/protocol";

export type FrameMessage = Extract<FromWorker, { t: "FRAME" }>;
export type FrameHandler = (frame: FrameMessage) => void;

export type WorkerLike = {
  postMessage: Worker["postMessage"];
  addEventListener: (type: "message", listener: (event: MessageEvent<FromWorker>) => void) => void;
  removeEventListener: (
    type: "message",
    listener: (event: MessageEvent<FromWorker>) => void,
  ) => void;
  terminate?: () => void;
};

export type SimBridgeOptions = {
  workerFactory?: () => WorkerLike;
  budgetMs?: number;
  maxSubsteps?: number;
  onError?: (message: string) => void;
  maxRetries?: number;
  retryDelayMs?: number;
};

export type SimBridge = {
  start: () => void;
  stop: () => void;
  step: (nowMs: number) => void;
  enqueue: (cmd: Cmd) => void;
  onFrame: (handler: FrameHandler) => () => void;
  getLastFrame: () => FrameMessage | null;
  isRunning: () => boolean;
};
