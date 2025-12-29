import type { WorkerLike } from "./types";

export const defaultWorkerFactory = (): WorkerLike => {
  return new Worker(new URL("../worker/sim.worker.ts", import.meta.url), { type: "module" });
};

