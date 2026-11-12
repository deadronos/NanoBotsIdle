import { DOCK_CAPACITY, outpostRouteScore } from "../../shared/miningOperations";

export type Outpost = {
  id: string;
  x: number;
  y: number;
  z: number;
  level: number;
  docked: Set<number>;
  queue: number[];
};

export type DockResult = "GRANTED" | "QUEUED" | "DENIED";

export class OutpostManager {
  private readonly outposts: Outpost[] = [];

  addOutpost(x: number, y: number, z: number, saved?: Pick<Outpost, "id" | "level">) {
    this.outposts.push({
      id: saved?.id ?? `outpost-${Date.now()}-${Math.random()}`,
      x,
      y,
      z,
      level: saved?.level ?? 1,
      docked: new Set(),
      queue: [],
    });
  }

  getOutposts() {
    return this.outposts;
  }

  getNearestOutpost(x: number, y: number, z: number): Outpost | null {
    if (this.outposts.length === 0) return null;
    let best = this.outposts[0];
    let minD = Number.MAX_VALUE;

    for (const op of this.outposts) {
      const d = (op.x - x) ** 2 + (op.y - y) ** 2 + (op.z - z) ** 2;
      if (d < minD) {
        minD = d;
        best = op;
      }
    }
    return best;
  }

  /**
   * Choose an outpost balancing distance and current load (docked + queue).
   * Lower score is better. This is a lightweight heuristic to avoid busy outposts.
   */
  getBestOutpost(x: number, y: number, z: number): Outpost | null {
    if (this.outposts.length === 0) return null;
    let best: Outpost | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const op of this.outposts) {
      const dist = Math.hypot(op.x - x, op.y - y, op.z - z);
      const score = outpostRouteScore(dist, op.docked.size, op.queue.length);
      if (score < bestScore) {
        bestScore = score;
        best = op;
      }
    }
    return best;
  }

  requestDock(outpost: Outpost, droneId: number): DockResult {
    // If already docked, keep it
    if (outpost.docked.has(droneId)) return "GRANTED";

    // If slots available and queue empty (or at front), allow
    if (outpost.docked.size < DOCK_CAPACITY) {
      if (outpost.queue.length === 0 || outpost.queue[0] === droneId) {
        if (outpost.queue[0] === droneId) outpost.queue.shift();
        outpost.docked.add(droneId);
        return "GRANTED";
      }
    }

    // Otherwise, queue
    if (!outpost.queue.includes(droneId)) {
      outpost.queue.push(droneId);
    }
    return "QUEUED";
  }

  undock(outpost: Outpost, droneId: number) {
    if (outpost.docked.has(droneId)) {
      outpost.docked.delete(droneId);
    }
    // Remove from queue if they leave early
    const qIdx = outpost.queue.indexOf(droneId);
    if (qIdx !== -1) {
      outpost.queue.splice(qIdx, 1);
    }
  }

  getQueueLength(outpost: Outpost) {
    return outpost.queue.length;
  }
}
