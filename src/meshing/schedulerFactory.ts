import type { MeshResult } from "../shared/meshingProtocol";
import { getVoxelMaterialAt } from "../sim/collision";
import { createApronField, fillApronField } from "./apronField";
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
      fillApronField(materials, {
        size: chunkSize,
        origin,
        materialAt: (x, y, z) => getVoxelMaterialAt(x, y, z, prestigeLevel, seed),
      });

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
