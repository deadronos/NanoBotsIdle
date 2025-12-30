/// <reference lib="webworker" />

import { handleMeshingJob } from "../meshing/workerHandler";
import type { FromMeshingWorker, ToMeshingWorker } from "../shared/meshingProtocol";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (event: MessageEvent<ToMeshingWorker>) => {
  const msg = event.data;
  const startTime = performance.now();
  const out = handleMeshingJob(msg);
  const meshingTimeMs = performance.now() - startTime;

  if (out.t === "MESH_RESULT") {
    const resultWithTiming = { ...out, meshingTimeMs };
    const { positions, normals, indices } = out.geometry;
    const transfer: Transferable[] = [positions.buffer, normals.buffer, indices.buffer];
    ctx.postMessage(resultWithTiming satisfies FromMeshingWorker, transfer);
    return;
  }

  ctx.postMessage(out satisfies FromMeshingWorker);
});
