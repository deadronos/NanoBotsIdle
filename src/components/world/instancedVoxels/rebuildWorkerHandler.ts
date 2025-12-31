import type {
  FromInstanceRebuildWorker,
  InstanceRebuildJob,
} from "../../../shared/instanceRebuildProtocol";
import { getVoxelColor } from "../../../utils";

/**
 * Process an instance rebuild job in the worker.
 * Computes matrices and colors for all voxel instances.
 */
export const handleInstanceRebuildJob = (
  job: InstanceRebuildJob,
): FromInstanceRebuildWorker => {
  try {
    const { positions, waterLevel } = job;
    const count = Math.floor(positions.length / 3);

    // Allocate output buffers
    const matrices = new Float32Array(count * 16);
    const colors = new Float32Array(count * 3);

    // Process each voxel instance
    for (let i = 0; i < count; i += 1) {
      const posBase = i * 3;
      const x = positions[posBase];
      const y = positions[posBase + 1];
      const z = positions[posBase + 2];

      // Build 4x4 identity matrix with translation
      const matBase = i * 16;
      matrices[matBase + 0] = 1; // m11
      matrices[matBase + 1] = 0; // m12
      matrices[matBase + 2] = 0; // m13
      matrices[matBase + 3] = 0; // m14
      matrices[matBase + 4] = 0; // m21
      matrices[matBase + 5] = 1; // m22
      matrices[matBase + 6] = 0; // m23
      matrices[matBase + 7] = 0; // m24
      matrices[matBase + 8] = 0; // m31
      matrices[matBase + 9] = 0; // m32
      matrices[matBase + 10] = 1; // m33
      matrices[matBase + 11] = 0; // m34
      matrices[matBase + 12] = x; // m41 (translation x)
      matrices[matBase + 13] = y; // m42 (translation y)
      matrices[matBase + 14] = z; // m43 (translation z)
      matrices[matBase + 15] = 1; // m44

      // Compute color based on height
      const colorHex = getVoxelColor(y, waterLevel);
      const r = ((colorHex >> 16) & 0xff) / 255;
      const g = ((colorHex >> 8) & 0xff) / 255;
      const b = (colorHex & 0xff) / 255;

      const colorBase = i * 3;
      colors[colorBase + 0] = r;
      colors[colorBase + 1] = g;
      colors[colorBase + 2] = b;
    }

    return {
      t: "REBUILD_RESULT",
      jobId: job.jobId,
      matrices,
      colors,
      count,
    };
  } catch (error) {
    return {
      t: "REBUILD_ERROR",
      jobId: job.jobId,
      message: error instanceof Error ? error.message : String(error),
    };
  }
};
