import type { FromMeshingWorker,ToMeshingWorker } from "../shared/meshingProtocol";
import { greedyMeshChunk } from "./greedyMesher";

export const handleMeshingJob = (job: ToMeshingWorker): FromMeshingWorker => {
  if (job.t !== "MESH_CHUNK") {
    return {
      t: "MESH_ERROR",
      jobId: (job as { jobId?: number }).jobId ?? -1,
      chunk: (job as { chunk?: { cx: number; cy: number; cz: number; size: number } }).chunk ?? {
        cx: 0,
        cy: 0,
        cz: 0,
        size: 16,
      },
      rev: (job as { rev?: number }).rev ?? 0,
      message: `Unknown job type`,
    };
  }

  try {
    const geometry = greedyMeshChunk({
      size: job.chunk.size,
      origin: job.origin,
      materials: job.materials,
    });

    return {
      t: "MESH_RESULT",
      jobId: job.jobId,
      chunk: job.chunk,
      rev: job.rev,
      geometry,
    };
  } catch (err) {
    return {
      t: "MESH_ERROR",
      jobId: job.jobId,
      chunk: job.chunk,
      rev: job.rev,
      message: err instanceof Error ? err.message : String(err),
    };
  }
};

