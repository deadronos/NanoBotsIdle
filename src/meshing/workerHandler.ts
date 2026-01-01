import type { FromMeshingWorker, ToMeshingWorker } from "../shared/meshingProtocol";
import { downsampleMaterials, greedyMeshChunk } from "./greedyMesher";
import type { MeshGeometry } from "./meshTypes";

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

const colorFromHeight = (y: number, waterLevel: number): [number, number, number] => {
  // Water
  if (y < waterLevel + 0.5) return [0x2d / 255, 0x73 / 255, 0xbf / 255];
  
  // Sand/Beach
  if (y < waterLevel + 2.5) return [0xe3 / 255, 0xdb / 255, 0xa3 / 255];

  // Surface: Grass/Dirt
  if (y >= waterLevel + 2.5 && y < waterLevel + 20) {
    if (y < waterLevel + 6) return [0x59 / 255, 0xa8 / 255, 0x48 / 255]; // Light Green
    return [0x3b / 255, 0x70 / 255, 0x32 / 255]; // Darker Green
  }

  // Mountains / High peaks
  if (y >= waterLevel + 20) return [0x6e / 255, 0x6e / 255, 0x6e / 255]; // Grey

  // Below Water (but handled by top check usually if fluid, but this is for solid blocks)
  // Currently solid blocks under water are valid.
  
  // Strata 2: Stone/Iron (approx 0 to -20 relative to water if we dug down?)
  // Wait, in this game "waterLevel" is usually -12 or 0. Let's assume standard coords.
  // Deep layers
  if (y < waterLevel - 20) {
     return [0x2a / 255, 0x1a / 255, 0x3d / 255]; // Deep Crystal/Obsidian (Dark Purple)
  }
  if (y < waterLevel - 5) {
     return [0x4a / 255, 0x4a / 255, 0x5a / 255]; // Stone/Iron (Blue-Grey)
  }

  // Fallback
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

    // Compute bounding sphere in worker thread to offload from main thread
    const boundingSphere = computeBoundingSphere(geometry.positions);

    const lods = [] as { level: "low"; geometry: MeshGeometry }[];
    if (job.chunk.size >= 2) {
      const downsampled = downsampleMaterials(job.materials, job.chunk.size, 2);
      const low = greedyMeshChunk({
        size: downsampled.size,
        origin: job.origin,
        voxelSize: downsampled.voxelSize,
        materials: downsampled.materials,
      });
      const lowColors = buildColors(low.positions, waterLevel);
      const lowBoundingSphere = computeBoundingSphere(low.positions);
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
