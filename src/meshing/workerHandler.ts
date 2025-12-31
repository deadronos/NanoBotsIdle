import type { FromMeshingWorker, ToMeshingWorker } from "../shared/meshingProtocol";
import { downsampleMaterials, greedyMeshChunk } from "./greedyMesher";

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

    const lods = [] as { level: "low"; geometry: typeof geometry }[];
    if (job.chunk.size >= 2) {
      const downsampled = downsampleMaterials(job.materials, job.chunk.size, 2);
      const low = greedyMeshChunk({
        size: downsampled.size,
        origin: job.origin,
        voxelSize: downsampled.voxelSize,
        materials: downsampled.materials,
      });
      lods.push({ level: "low", geometry: low });
    }

    return {
      t: "MESH_RESULT",
      jobId: job.jobId,
      chunk: job.chunk,
      rev: job.rev,
      geometry,
      lods: lods.length > 0 ? lods : undefined,
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
