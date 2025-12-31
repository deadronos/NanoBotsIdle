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
    const { positions, normals, indices, colors } = out.geometry;
    const transfer: Transferable[] = [positions.buffer, normals.buffer, indices.buffer];
    if (colors) transfer.push(colors.buffer);

    if (out.lods) {
      for (const lod of out.lods) {
        transfer.push(
          lod.geometry.positions.buffer,
          lod.geometry.normals.buffer,
          lod.geometry.indices.buffer,
        );
        if (lod.geometry.colors) transfer.push(lod.geometry.colors.buffer);
      }
    }
    ctx.postMessage(resultWithTiming satisfies FromMeshingWorker, transfer);
    return;
  }

  ctx.postMessage(out satisfies FromMeshingWorker);
});
