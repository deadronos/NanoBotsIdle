/// <reference lib="webworker" />

import { handleMeshingJob } from "../meshing/workerHandler";
import type { FromMeshingWorker, ToMeshingWorker } from "../shared/meshingProtocol";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (event: MessageEvent<ToMeshingWorker>) => {
  const msg = event.data;
  const out = handleMeshingJob(msg);

  if (out.t === "MESH_RESULT") {
    const { positions, normals, indices } = out.geometry;
    const transfer: Transferable[] = [positions.buffer, normals.buffer, indices.buffer];
    ctx.postMessage(out satisfies FromMeshingWorker, transfer);
    return;
  }

  ctx.postMessage(out satisfies FromMeshingWorker);
});
