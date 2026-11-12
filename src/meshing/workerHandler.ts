import { defaultTerrainConfig } from "../config/terrain";
import type { FromMeshingWorker, ToMeshingWorker } from "../shared/meshingProtocol";
import { coarsenInterior } from "./coarsenInterior";
import { greedyMeshChunk } from "./greedyMesher";
import type { MeshGeometry } from "./meshTypes";
import { buildTerrainVertexColors } from "./terrainVertexColors";

/**
 * Compute bounding sphere for mesh geometry in worker thread.
 * This offloads expensive iteration from the main thread.
 */
const computeBoundingSphere = (
  positions: Float32Array,
): { center: { x: number; y: number; z: number }; radius: number } => {
  if (positions.length === 0) {
    return { center: { x: 0, y: 0, z: 0 }, radius: 0 };
  }

  // First pass: compute center (average of all vertices)
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  const vertexCount = positions.length / 3;

  for (let i = 0; i < positions.length; i += 3) {
    sumX += positions[i];
    sumY += positions[i + 1];
    sumZ += positions[i + 2];
  }

  const centerX = sumX / vertexCount;
  const centerY = sumY / vertexCount;
  const centerZ = sumZ / vertexCount;

  // Second pass: compute radius (max distance from center)
  let maxRadiusSq = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - centerX;
    const dy = positions[i + 1] - centerY;
    const dz = positions[i + 2] - centerZ;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > maxRadiusSq) {
      maxRadiusSq = distSq;
    }
  }

  return {
    center: { x: centerX, y: centerY, z: centerZ },
    radius: Math.sqrt(maxRadiusSq),
  };
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
    const waterLevel = job.waterLevel ?? defaultTerrainConfig.waterLevel;
    const colors = buildTerrainVertexColors(geometry, waterLevel, job);

    // Compute bounding sphere in worker thread to offload from main thread
    const boundingSphere = computeBoundingSphere(geometry.positions);

    const lods = [] as { level: "low"; geometry: MeshGeometry }[];
    if (job.chunk.size >= 4) {
      const low = greedyMeshChunk({
        size: job.chunk.size,
        origin: job.origin,
        materials: coarsenInterior(job.materials, job.chunk.size),
      });
      const lowColors = buildTerrainVertexColors(low, waterLevel, job);
      const lowBoundingSphere = computeBoundingSphere(low.positions);
      if (low.indices.length < geometry.indices.length)
        lods.push({
          level: "low",
          geometry: { ...low, colors: lowColors, boundingSphere: lowBoundingSphere },
        });
    }

    return {
      t: "MESH_RESULT",
      jobId: job.jobId,
      chunk: job.chunk,
      rev: job.rev,
      geometry: { ...geometry, colors, boundingSphere },
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
