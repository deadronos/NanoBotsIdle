/// <reference lib="webworker" />

import { handleInstanceRebuildJob } from "../components/world/instancedVoxels/rebuildWorkerHandler";
import type {
  FromInstanceRebuildWorker,
  ToInstanceRebuildWorker,
} from "../shared/instanceRebuildProtocol";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (event: MessageEvent<ToInstanceRebuildWorker>) => {
  const msg = event.data;
  const _startTime = performance.now();
  const out = handleInstanceRebuildJob(msg);
  const _rebuildTimeMs = performance.now() - _startTime;

  if (out.t === "REBUILD_RESULT") {
    // Transfer the typed arrays back to the main thread
    const transfer: Transferable[] = [out.matrices.buffer, out.colors.buffer];
    ctx.postMessage(out satisfies FromInstanceRebuildWorker, transfer);
    return;
  }

  // Error case - no transferables
  ctx.postMessage(out satisfies FromInstanceRebuildWorker);
});
