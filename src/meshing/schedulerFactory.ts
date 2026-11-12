import type { MeshResult } from "../shared/meshingProtocol";
import { createVoxelColumnSampler } from "../sim/collision";
import { createApronField, index3D } from "./apronField";
import type { MeshingWorkerLike } from "./meshingScheduler";
import { MeshingScheduler } from "./meshingScheduler";
import { defaultMeshingWorkerFactory } from "./meshingWorkerFactory";

export interface SchedulerOptions {
  chunkSize: number;
  prestigeLevel: number;
  waterLevel: number;
  seed?: number;
  isChunkVisible?: (coord: { cx: number; cy: number; cz: number }) => boolean;
  onApply: (res: MeshResult) => void;
  getPriority: (coord: { cx: number; cy: number; cz: number }) => number;
  maxInFlight: number;
  maxQueueSize: number;
  worker?: MeshingWorkerLike;
}

export const createMeshingScheduler = (options: SchedulerOptions): MeshingScheduler => {
  const {
    chunkSize,
    prestigeLevel,
    waterLevel,
    seed,
    isChunkVisible,
    onApply,
    getPriority,
    maxInFlight,
    maxQueueSize,
    worker = defaultMeshingWorkerFactory(),
  } = options;

  return new MeshingScheduler({
    worker,
    chunkSize,
    buildJob: (coord, rev, jobId) => {
      const origin = {
        x: coord.cx * chunkSize,
        y: coord.cy * chunkSize,
        z: coord.cz * chunkSize,
      };

      const materials = createApronField(chunkSize);
      const dim = chunkSize + 2;
      for (let z = 0; z < dim; z++) {
        for (let x = 0; x < dim; x++) {
          const sample = createVoxelColumnSampler(
            origin.x + x - 1,
            origin.z + z - 1,
            prestigeLevel,
            seed,
          );
          for (let y = 0; y < dim; y++) {
            materials[index3D(x, y, z, dim)] = sample(origin.y + y - 1);
          }
        }
      }

      return {
        msg: {
          t: "MESH_CHUNK",
          jobId,
          rev,
          chunk: { ...coord, size: chunkSize },
          origin,
          materials,
          waterLevel,
        },
        transfer: [materials.buffer],
      };
    },
    onApply,
    maxInFlight,
    maxQueueSize,
    getPriority,
    isVisible: isChunkVisible,
  });
};
