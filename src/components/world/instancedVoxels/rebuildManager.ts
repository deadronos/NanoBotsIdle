import type { InstancedMesh } from "three";
import { InstancedBufferAttribute } from "three";

import type {
  FromInstanceRebuildWorker,
  InstanceRebuildJob,
} from "../../../shared/instanceRebuildProtocol";
import type { InstanceRebuildWorkerLike } from "./rebuildWorkerFactory";
import { createInstanceRebuildWorker } from "./rebuildWorkerFactory";

type PendingJob = {
  jobId: number;
  resolve: (result: { matrices: Float32Array; colors: Float32Array; count: number }) => void;
  reject: (error: Error) => void;
};

/**
 * Manages instance rebuild jobs using a worker and double-buffering strategy.
 * Ensures atomic updates by preparing buffers off-thread and swapping them in one frame.
 */
export class InstanceRebuildManager {
  private worker: InstanceRebuildWorkerLike;
  private nextJobId = 0;
  private pendingJobs = new Map<number, PendingJob>();

  constructor(worker?: InstanceRebuildWorkerLike) {
    this.worker = worker ?? createInstanceRebuildWorker();
    this.worker.addEventListener("message", this.handleWorkerMessage);
  }

  /**
   * Request a rebuild of instances using the worker.
   * Returns a promise that resolves with the computed matrices and colors.
   */
  async requestRebuild(
    positions: number[],
    waterLevel: number,
  ): Promise<{ matrices: Float32Array; colors: Float32Array; count: number }> {
    const jobId = this.nextJobId++;

    // Copy positions to a transferable Float32Array
    const positionsArray = new Float32Array(positions);

    return new Promise((resolve, reject) => {
      this.pendingJobs.set(jobId, { jobId, resolve, reject });

      const job: InstanceRebuildJob = {
        t: "REBUILD_INSTANCES",
        jobId,
        positions: positionsArray,
        waterLevel,
      };

      // Transfer the positions array to the worker (zero-copy)
      this.worker.postMessage(job, [positionsArray.buffer]);
    });
  }

  /**
   * Apply the rebuild result to the mesh in one atomic operation.
   * This implements the double-buffering strategy by swapping in new buffers.
   */
  applyRebuildToMesh(
    mesh: InstancedMesh,
    matrices: Float32Array,
    colors: Float32Array,
    count: number,
  ): void {
    // Update instance matrix
    mesh.instanceMatrix = new InstancedBufferAttribute(matrices, 16);
    mesh.geometry.setAttribute("instanceMatrix", mesh.instanceMatrix);
    mesh.instanceMatrix.needsUpdate = true;

    // Update instance colors
    mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
    mesh.geometry.setAttribute("instanceColor", mesh.instanceColor);
    mesh.instanceColor.needsUpdate = true;

    // Update count
    mesh.count = count;
  }

  private handleWorkerMessage = (event: MessageEvent<FromInstanceRebuildWorker>): void => {
    const msg = event.data;

    if (msg.t === "REBUILD_RESULT") {
      const pending = this.pendingJobs.get(msg.jobId);
      if (pending) {
        this.pendingJobs.delete(msg.jobId);
        pending.resolve({
          matrices: msg.matrices,
          colors: msg.colors,
          count: msg.count,
        });
      }
    } else if (msg.t === "REBUILD_ERROR") {
      const pending = this.pendingJobs.get(msg.jobId);
      if (pending) {
        this.pendingJobs.delete(msg.jobId);
        pending.reject(new Error(msg.message));
      }
    }
  };

  /**
   * Terminate the worker and clean up resources.
   */
  terminate(): void {
    this.worker.removeEventListener("message", this.handleWorkerMessage);
    this.worker.terminate();
    this.pendingJobs.clear();
  }
}
