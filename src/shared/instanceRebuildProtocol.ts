/**
 * Protocol for offloading voxel instance rebuilds to a worker.
 * Uses transferable ArrayBuffers for efficient data transfer.
 */

export type VoxelColorFn = (x: number, y: number, z: number) => number;

export type InstanceRebuildJob = {
  t: "REBUILD_INSTANCES";
  jobId: number;
  positions: Float32Array; // Flat array [x, y, z, x, y, z, ...]
  waterLevel: number; // For color computation
};

export type InstanceRebuildResult = {
  t: "REBUILD_RESULT";
  jobId: number;
  matrices: Float32Array; // 16 floats per instance (4x4 matrix)
  colors: Float32Array; // 3 floats per instance (RGB)
  count: number;
};

export type InstanceRebuildError = {
  t: "REBUILD_ERROR";
  jobId: number;
  message: string;
};

export type ToInstanceRebuildWorker = InstanceRebuildJob;
export type FromInstanceRebuildWorker = InstanceRebuildResult | InstanceRebuildError;
