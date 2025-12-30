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

    if (out.lods) {
      for (const lod of out.lods) {
        transfer.push(
          lod.geometry.positions.buffer,
          lod.geometry.normals.buffer,
          lod.geometry.indices.buffer,
        );
      }
    }
    ctx.postMessage(out satisfies FromMeshingWorker, transfer);
    return;
  }

  ctx.postMessage(out satisfies FromMeshingWorker);
});
