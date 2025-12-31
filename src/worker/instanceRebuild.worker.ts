/// <reference lib="webworker" />

import type {
  FromInstanceRebuildWorker,
  ToInstanceRebuildWorker,
} from "../shared/instanceRebuildProtocol";
import { handleInstanceRebuildJob } from "../components/world/instancedVoxels/rebuildWorkerHandler";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (event: MessageEvent<ToInstanceRebuildWorker>) => {
  const msg = event.data;
  const startTime = performance.now();
  const out = handleInstanceRebuildJob(msg);
  const rebuildTimeMs = performance.now() - startTime;

  if (out.t === "REBUILD_RESULT") {
    // Transfer the typed arrays back to the main thread
    const transfer: Transferable[] = [out.matrices.buffer, out.colors.buffer];
    ctx.postMessage(out satisfies FromInstanceRebuildWorker, transfer);
    return;
  }

  // Error case - no transferables
  ctx.postMessage(out satisfies FromInstanceRebuildWorker);
});
