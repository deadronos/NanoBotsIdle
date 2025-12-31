import type { FromMeshingWorker, ToMeshingWorker } from "../shared/meshingProtocol";
import { downsampleMaterials, greedyMeshChunk } from "./greedyMesher";

const colorFromHeight = (y: number, waterLevel: number): [number, number, number] => {
  if (y < waterLevel - 2) return [0x1a / 255, 0x4d / 255, 0x8c / 255];
  if (y < waterLevel + 0.5) return [0x2d / 255, 0x73 / 255, 0xbf / 255];
  if (y < waterLevel + 2.5) return [0xe3 / 255, 0xdb / 255, 0xa3 / 255];
  if (y < waterLevel + 6) return [0x59 / 255, 0xa8 / 255, 0x48 / 255];
  if (y < waterLevel + 12) return [0x3b / 255, 0x70 / 255, 0x32 / 255];
  if (y < waterLevel + 20) return [0x6e / 255, 0x6e / 255, 0x6e / 255];
  return [1, 1, 1];
};

const buildColors = (positions: Float32Array, waterLevel: number) => {
  const colors = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1];
    const [r, g, b] = colorFromHeight(y, waterLevel);
    colors[i] = r;
    colors[i + 1] = g;
    colors[i + 2] = b;
  }
  return colors;
};

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
    const waterLevel = job.waterLevel ?? -12;
    const colors = buildColors(geometry.positions, waterLevel);

    const lods = [] as { level: "low"; geometry: typeof geometry }[];
    if (job.chunk.size >= 2) {
      const downsampled = downsampleMaterials(job.materials, job.chunk.size, 2);
      const low = greedyMeshChunk({
        size: downsampled.size,
        origin: job.origin,
        voxelSize: downsampled.voxelSize,
        materials: downsampled.materials,
      });
      const lowColors = buildColors(low.positions, waterLevel);
      lods.push({ level: "low", geometry: { ...low, colors: lowColors } });
    }

    return {
      t: "MESH_RESULT",
      jobId: job.jobId,
      chunk: job.chunk,
      rev: job.rev,
      geometry: { ...geometry, colors },
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
