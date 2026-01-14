import { chunkKey } from "../components/world/chunkHelpers";
import type { FromMeshingWorker, MeshResult, ToMeshingWorker } from "../shared/meshingProtocol";
import { getTelemetryCollector } from "../telemetry";
import { error, warn } from "../utils/logger";
import { PriorityQueue } from "./priorityQueue";

export type ChunkCoord3 = { cx: number; cy: number; cz: number };

type DirtyEntry = {
  key: string;
  coord: ChunkCoord3;
  priority: number;
  token: number;
};

export type MeshingWorkerLike = {
  postMessage: (message: ToMeshingWorker, transfer?: Transferable[]) => void;
  addEventListener: (
    type: "message",
    handler: (event: MessageEvent<FromMeshingWorker>) => void,
  ) => void;
  removeEventListener: (
    type: "message",
    handler: (event: MessageEvent<FromMeshingWorker>) => void,
  ) => void;
  terminate?: () => void;
};

const parseChunkKey = (key: string): ChunkCoord3 => {
  const [cx, cy, cz] = key.split(",").map((v) => Number(v));
  return { cx, cy, cz };
};

export class MeshingScheduler {
  private readonly worker: MeshingWorkerLike;
  private readonly chunkSize: number;
  private readonly buildJob: (
    coord: ChunkCoord3,
    rev: number,
    jobId: number,
  ) => {
    msg: ToMeshingWorker;
    transfer: Transferable[];
  };
  private readonly onApply: (result: MeshResult) => void;
  private readonly maxInFlight: number;
  private readonly maxQueueSize: number;
  private readonly maxRetries: number;

  private getPriority: ((coord: ChunkCoord3) => number) | null;
  private isVisible: ((coord: ChunkCoord3) => boolean) | null;

  private readonly dirty = new Set<string>();
  private readonly priorityQueue = new PriorityQueue<DirtyEntry>((a, b) => a.priority - b.priority);
  private readonly dirtyTokenByKey = new Map<string, number>();
  private readonly revByChunk = new Map<string, number>();
  private readonly inFlightByJob = new Map<
    number,
    { key: string; rev: number; queuedAt: number; retryCount: number }
  >();
  private readonly retryByKey = new Map<string, number>();
  private nextJobId = 1;
  private droppedTasksCount = 0;

  private readonly onMessage = (event: MessageEvent<FromMeshingWorker>) => {
    const msg = event.data;

    if (msg.t === "MESH_RESULT") {
      const key = chunkKey(msg.chunk.cx, msg.chunk.cy, msg.chunk.cz);
      const currentRev = this.revByChunk.get(key) ?? 0;
      const inFlightData = this.inFlightByJob.get(msg.jobId);
      this.inFlightByJob.delete(msg.jobId);

      // Track telemetry if timing data is available
      const telemetry = getTelemetryCollector();
      if (telemetry.isEnabled()) {
        if (msg.meshingTimeMs !== undefined) {
          telemetry.recordMeshingTime(msg.meshingTimeMs);
        }
        if (inFlightData) {
          const waitTime = performance.now() - inFlightData.queuedAt;
          telemetry.recordMeshingWaitTime(waitTime);
        }
      }

      if (msg.rev !== currentRev) {
        // stale result (out-of-order or chunk dirtied while job was in flight)
        this.pump();
        return;
      }

      this.onApply(msg);
      this.pump();
      return;
    }

    if (msg.t === "MESH_ERROR") {
      const inFlightData = this.inFlightByJob.get(msg.jobId);
      this.inFlightByJob.delete(msg.jobId);

      // Track error in telemetry
      const telemetry = getTelemetryCollector();
      telemetry.recordMeshingError();

      if (inFlightData) {
        const key = inFlightData.key;
        const retryCount = inFlightData.retryCount;

        // Log the error with details
        warn(
          `Meshing error for chunk ${msg.chunk.cx},${msg.chunk.cy},${msg.chunk.cz} ` +
            `(attempt ${retryCount + 1}/${this.maxRetries}): ${msg.message}`,
        );

        if (retryCount < this.maxRetries - 1) {
          // Retry: re-mark as dirty
          telemetry.recordMeshingRetry();
          const coord = parseChunkKey(key);
          this.markDirty(coord);

          // Update retry count for this chunk
          this.retryByKey.set(key, retryCount + 1);
        } else {
          // Max retries exceeded
          error(
            `Meshing failed after ${this.maxRetries} attempts for chunk ` +
              `${msg.chunk.cx},${msg.chunk.cy},${msg.chunk.cz}: ${msg.message}`,
          );
          // Clear retry count as we're giving up
          this.retryByKey.delete(key);
        }
      }

      this.pump();
    }
  };

  constructor(options: {
    worker: MeshingWorkerLike;
    chunkSize: number;
    buildJob: (
      coord: ChunkCoord3,
      rev: number,
      jobId: number,
    ) => {
      msg: ToMeshingWorker;
      transfer: Transferable[];
    };
    onApply: (result: MeshResult) => void;
    maxInFlight?: number;
    maxQueueSize?: number;
    maxRetries?: number;
    getPriority?: (coord: ChunkCoord3) => number;
    isVisible?: (coord: ChunkCoord3) => boolean;
  }) {
    this.worker = options.worker;
    this.chunkSize = options.chunkSize;
    this.buildJob = options.buildJob;
    this.onApply = options.onApply;
    this.maxInFlight = options.maxInFlight ?? 1;
    this.maxQueueSize = options.maxQueueSize ?? 256;
    this.maxRetries = options.maxRetries ?? 3;
    this.getPriority = options.getPriority ?? null;
    this.isVisible = options.isVisible ?? null;

    this.worker.addEventListener("message", this.onMessage);
  }

  setPriorityProvider(getPriority?: (coord: ChunkCoord3) => number) {
    this.getPriority = getPriority ?? null;
  }

  setVisibilityProvider(isVisible?: (coord: ChunkCoord3) => boolean) {
    this.isVisible = isVisible ?? null;
  }

  /**
   * Rebuilds the internal priority queue based on the current dirty set.
   * Call this when your priority function depends on a moving focus (e.g., player chunk).
   */
  reprioritizeDirty() {
    this.priorityQueue.clear();
    for (const key of this.dirty) {
      const coord = parseChunkKey(key);
      const token = this.dirtyTokenByKey.get(key) ?? 0;
      const priority = this.computePriority(coord);
      this.priorityQueue.push({ key, coord, token, priority });
    }
  }

  dispose() {
    this.worker.removeEventListener("message", this.onMessage);
    this.worker.terminate?.();
  }

  markDirty(coord: ChunkCoord3) {
    const key = chunkKey(coord.cx, coord.cy, coord.cz);
    const nextRev = (this.revByChunk.get(key) ?? 0) + 1;
    this.revByChunk.set(key, nextRev);

    // Check if adding this chunk would exceed queue size
    if (!this.dirty.has(key) && this.dirty.size >= this.maxQueueSize) {
      // Queue is full - drop the lowest priority task or reject this one
      // We only consider tasks that are currently valid (present in this.dirty)
      const worstEntry = this.priorityQueue.findMax((entry) => this.dirty.has(entry.key));
      const newPriority = this.computePriority(coord);

      if (worstEntry && newPriority < worstEntry.priority) {
        // New task has higher priority - drop the worst one
        this.dirty.delete(worstEntry.key);
        this.dirtyTokenByKey.delete(worstEntry.key);
        this.droppedTasksCount++;

        // Add the new task
        this.dirty.add(key);
        const token = (this.dirtyTokenByKey.get(key) ?? 0) + 1;
        this.dirtyTokenByKey.set(key, token);
        this.priorityQueue.push({ key, coord, token, priority: newPriority });
      } else {
        // New task has lower priority - drop it
        this.droppedTasksCount++;
        return;
      }
    } else {
      // Queue has space or chunk already in queue - add/update normally
      this.dirty.add(key);
      const token = (this.dirtyTokenByKey.get(key) ?? 0) + 1;
      this.dirtyTokenByKey.set(key, token);
      const priority = this.computePriority(coord);
      this.priorityQueue.push({ key, coord, token, priority });
    }
  }

  private computePriority(coord: ChunkCoord3): number {
    let priority = this.getPriority ? this.getPriority(coord) : 0;
    // Visible chunks get boosted priority (lower number = higher priority)
    if (this.isVisible && this.isVisible(coord)) {
      priority = priority * 0.5; // Visible chunks are twice as important
    }
    return priority;
  }

  markDirtyMany(coords: ChunkCoord3[]) {
    coords.forEach((c) => this.markDirty(c));
  }

  clearAll() {
    this.dirty.clear();
    this.priorityQueue.clear();
    this.dirtyTokenByKey.clear();
    this.revByChunk.clear();
    this.inFlightByJob.clear();
    this.droppedTasksCount = 0;
    this.retryByKey.clear();
  }

  private popNextDirty(): DirtyEntry | null {
    while (true) {
      const entry = this.priorityQueue.pop();
      if (!entry) return null;
      if (!this.dirty.has(entry.key)) continue;
      const currentToken = this.dirtyTokenByKey.get(entry.key) ?? 0;
      if (entry.token !== currentToken) continue;
      return entry;
    }
  }

  pump() {
    // Update telemetry with current queue state
    const telemetry = getTelemetryCollector();
    if (telemetry.isEnabled()) {
      telemetry.recordMeshingQueue(
        this.dirty.size,
        this.inFlightByJob.size,
        this.droppedTasksCount,
      );
    }

    while (this.inFlightByJob.size < this.maxInFlight && this.dirty.size > 0) {
      const next = this.popNextDirty();
      if (!next) return;

      const nextKey = next.key;
      this.dirty.delete(nextKey);
      const coord = next.coord;
      const rev = this.revByChunk.get(nextKey) ?? 0;
      const jobId = this.nextJobId++;
      const queuedAt = performance.now();
      const retryCount = this.retryByKey.get(nextKey) ?? 0;

      const { msg, transfer } = this.buildJob(coord, rev, jobId);

      this.inFlightByJob.set(jobId, { key: nextKey, rev, queuedAt, retryCount });
      this.worker.postMessage(msg, transfer);
    }
  }

  getChunkRevision(coord: ChunkCoord3) {
    return this.revByChunk.get(chunkKey(coord.cx, coord.cy, coord.cz)) ?? 0;
  }

  getInFlightCount() {
    return this.inFlightByJob.size;
  }

  getDirtyKeys() {
    return Array.from(this.dirty);
  }

  getChunkSize() {
    return this.chunkSize;
  }

  getDroppedTasksCount() {
    return this.droppedTasksCount;
  }

  getMaxQueueSize() {
    return this.maxQueueSize;
  }
}
