import type { FromMeshingWorker, MeshResult, ToMeshingWorker } from "../shared/meshingProtocol";

export type ChunkCoord3 = { cx: number; cy: number; cz: number };

type DirtyEntry = {
  key: string;
  coord: ChunkCoord3;
  priority: number;
  order: number;
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

const chunkKey = (cx: number, cy: number, cz: number) => `${cx},${cy},${cz}`;
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

  private getPriority: ((coord: ChunkCoord3) => number) | null;

  private readonly dirty = new Set<string>();
  private readonly dirtyHeap: DirtyEntry[] = [];
  private readonly dirtyTokenByKey = new Map<string, number>();
  private dirtyOrder = 1;
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
    getPriority?: (coord: ChunkCoord3) => number;
  }) {
    this.worker = options.worker;
    this.chunkSize = options.chunkSize;
    this.buildJob = options.buildJob;
    this.onApply = options.onApply;
    this.maxInFlight = options.maxInFlight ?? 1;
    this.getPriority = options.getPriority ?? null;

    this.worker.addEventListener("message", this.onMessage);
  }

  setPriorityProvider(getPriority?: (coord: ChunkCoord3) => number) {
    this.getPriority = getPriority ?? null;
  }

  /**
   * Rebuilds the internal priority queue based on the current dirty set.
   * Call this when your priority function depends on a moving focus (e.g., player chunk).
   */
  reprioritizeDirty() {
    this.dirtyHeap.length = 0;
    for (const key of this.dirty) {
      const coord = parseChunkKey(key);
      const token = this.dirtyTokenByKey.get(key) ?? 0;
      const order = this.dirtyOrder++;
      const priority = this.getPriority ? this.getPriority(coord) : 0;
      this.heapPush({ key, coord, token, order, priority });
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
    this.dirty.add(key);

    const token = (this.dirtyTokenByKey.get(key) ?? 0) + 1;
    this.dirtyTokenByKey.set(key, token);

    const order = this.dirtyOrder++;
    const priority = this.getPriority ? this.getPriority(coord) : 0;
    this.heapPush({ key, coord, token, order, priority });
  }

  markDirtyMany(coords: ChunkCoord3[]) {
    coords.forEach((c) => this.markDirty(c));
  }

  clearAll() {
    this.dirty.clear();
    this.dirtyHeap.length = 0;
    this.dirtyTokenByKey.clear();
    this.revByChunk.clear();
    this.inFlightByJob.clear();
  }

  private heapLess(a: DirtyEntry, b: DirtyEntry) {
    if (a.priority !== b.priority) return a.priority < b.priority;
    return a.order < b.order;
  }

  private heapPush(entry: DirtyEntry) {
    this.dirtyHeap.push(entry);
    this.heapSiftUp(this.dirtyHeap.length - 1);
  }

  private heapSiftUp(index: number) {
    let i = index;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!this.heapLess(this.dirtyHeap[i]!, this.dirtyHeap[parent]!)) break;
      const tmp = this.dirtyHeap[i]!;
      this.dirtyHeap[i] = this.dirtyHeap[parent]!;
      this.dirtyHeap[parent] = tmp;
      i = parent;
    }
  }

  private heapSiftDown(index: number) {
    let i = index;
    const n = this.dirtyHeap.length;
    while (true) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;

      if (left < n && this.heapLess(this.dirtyHeap[left]!, this.dirtyHeap[smallest]!)) {
        smallest = left;
      }
      if (right < n && this.heapLess(this.dirtyHeap[right]!, this.dirtyHeap[smallest]!)) {
        smallest = right;
      }
      if (smallest === i) break;

      const tmp = this.dirtyHeap[i]!;
      this.dirtyHeap[i] = this.dirtyHeap[smallest]!;
      this.dirtyHeap[smallest] = tmp;
      i = smallest;
    }
  }

  private heapPop(): DirtyEntry | null {
    if (this.dirtyHeap.length === 0) return null;
    const root = this.dirtyHeap[0]!;
    const last = this.dirtyHeap.pop()!;
    if (this.dirtyHeap.length > 0) {
      this.dirtyHeap[0] = last;
      this.heapSiftDown(0);
    }
    return root;
  }

  private popNextDirty(): DirtyEntry | null {
    while (true) {
      const entry = this.heapPop();
      if (!entry) return null;
      if (!this.dirty.has(entry.key)) continue;
      const currentToken = this.dirtyTokenByKey.get(entry.key) ?? 0;
      if (entry.token !== currentToken) continue;
      return entry;
    }
  }

  pump() {
    while (this.inFlightByJob.size < this.maxInFlight && this.dirty.size > 0) {
      const next = this.popNextDirty();
      if (!next) return;

      const nextKey = next.key;
      this.dirty.delete(nextKey);
      const coord = next.coord;
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
