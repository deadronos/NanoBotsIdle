import type { FromMeshingWorker, MeshResult, ToMeshingWorker } from "../shared/meshingProtocol";

export type ChunkCoord3 = { cx: number; cy: number; cz: number };

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

const chunkKey = (cx: number, cy: number, cz: number) => `${cx},${cy},${cz}`;
const parseChunkKey = (key: string): ChunkCoord3 => {
  const [cx, cy, cz] = key.split(",").map((v) => Number(v));
  return { cx, cy, cz };
};

export class MeshingScheduler {
  private readonly worker: MeshingWorkerLike;
  private readonly chunkSize: number;
  private readonly buildJob: (coord: ChunkCoord3, rev: number, jobId: number) => {
    msg: ToMeshingWorker;
    transfer: Transferable[];
  };
  private readonly onApply: (result: MeshResult) => void;
  private readonly maxInFlight: number;

  private readonly dirty = new Set<string>();
  private readonly revByChunk = new Map<string, number>();
  private readonly inFlightByJob = new Map<number, { key: string; rev: number }>();
  private nextJobId = 1;

  private readonly onMessage = (event: MessageEvent<FromMeshingWorker>) => {
    const msg = event.data;

    if (msg.t === "MESH_RESULT") {
      const key = chunkKey(msg.chunk.cx, msg.chunk.cy, msg.chunk.cz);
      const currentRev = this.revByChunk.get(key) ?? 0;
      this.inFlightByJob.delete(msg.jobId);

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
      this.inFlightByJob.delete(msg.jobId);
      this.pump();
    }
  };

  constructor(options: {
    worker: MeshingWorkerLike;
    chunkSize: number;
    buildJob: (coord: ChunkCoord3, rev: number, jobId: number) => {
      msg: ToMeshingWorker;
      transfer: Transferable[];
    };
    onApply: (result: MeshResult) => void;
    maxInFlight?: number;
  }) {
    this.worker = options.worker;
    this.chunkSize = options.chunkSize;
    this.buildJob = options.buildJob;
    this.onApply = options.onApply;
    this.maxInFlight = options.maxInFlight ?? 1;

    this.worker.addEventListener("message", this.onMessage);
  }

  dispose() {
    this.worker.removeEventListener("message", this.onMessage);
    this.worker.terminate?.();
  }

  markDirty(coord: ChunkCoord3) {
    const key = chunkKey(coord.cx, coord.cy, coord.cz);
    const nextRev = (this.revByChunk.get(key) ?? 0) + 1;
    this.revByChunk.set(key, nextRev);
    this.dirty.add(key);
  }

  markDirtyMany(coords: ChunkCoord3[]) {
    coords.forEach((c) => this.markDirty(c));
  }

  clearAll() {
    this.dirty.clear();
    this.revByChunk.clear();
    this.inFlightByJob.clear();
  }

  pump() {
    while (this.inFlightByJob.size < this.maxInFlight && this.dirty.size > 0) {
      const nextKey = this.dirty.values().next().value as string;
      this.dirty.delete(nextKey);
      const coord = parseChunkKey(nextKey);
      const rev = this.revByChunk.get(nextKey) ?? 0;
      const jobId = this.nextJobId++;

      const { msg, transfer } = this.buildJob(coord, rev, jobId);

      this.inFlightByJob.set(jobId, { key: nextKey, rev });
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
}

