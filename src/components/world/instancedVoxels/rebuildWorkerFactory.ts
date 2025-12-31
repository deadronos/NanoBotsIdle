import type {
  FromInstanceRebuildWorker,
  ToInstanceRebuildWorker,
} from "../../../shared/instanceRebuildProtocol";

export type InstanceRebuildWorkerLike = {
  postMessage: (message: ToInstanceRebuildWorker, transfer?: Transferable[]) => void;
  addEventListener: (
    type: "message",
    handler: (event: MessageEvent<FromInstanceRebuildWorker>) => void,
  ) => void;
  removeEventListener: (
    type: "message",
    handler: (event: MessageEvent<FromInstanceRebuildWorker>) => void,
  ) => void;
  terminate: () => void;
};

export const createInstanceRebuildWorker = (): InstanceRebuildWorkerLike => {
  const worker = new Worker(new URL("../../../worker/instanceRebuild.worker.ts", import.meta.url), {
    type: "module",
  });

  return {
    postMessage: (message, transfer) => {
      if (transfer) {
        worker.postMessage(message, transfer);
        return;
      }
      worker.postMessage(message);
    },
    addEventListener: (type, handler) =>
      worker.addEventListener(type, handler as unknown as EventListener),
    removeEventListener: (type, handler) =>
      worker.removeEventListener(type, handler as unknown as EventListener),
    terminate: () => worker.terminate(),
  };
};
