import type { MeshingWorkerLike } from "./meshingScheduler";

export const defaultMeshingWorkerFactory = (): MeshingWorkerLike => {
  const worker = new Worker(new URL("../worker/meshing.worker.ts", import.meta.url), {
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
