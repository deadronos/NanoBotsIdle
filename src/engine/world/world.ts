import { type Config, getConfig } from "../../config/index";
import type { VoxelEdit } from "../../shared/protocol";
import {
  coordsFromVoxelKey,
  MATERIAL_AIR,
  MATERIAL_BEDROCK,
  MATERIAL_SOLID,
  voxelKey,
} from "../../shared/voxel";
import { getSurfaceHeightCore } from "../../sim/terrain-core";
import { getBaseMaterialAt } from "../../sim/voxelBaseMaterial";
import { debug } from "../../utils/logger";

export { MATERIAL_AIR, MATERIAL_BEDROCK, MATERIAL_SOLID };

const NEIGHBOR_OFFSETS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

const FRONTIER_UPDATE_OFFSETS = [[0, 0, 0], ...NEIGHBOR_OFFSETS] as const;

type WorldOptions = {
  seed: number;
};

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

export class WorldModel {
  private readonly seed: number;
  private readonly edits = new Map<string, number>();
  private readonly bedrockY: number;
  private readonly waterlineVoxelY: number;
  private readonly frontierSolid = new Set<string>();
  private readonly frontierAboveWater = new Set<string>();
  private readonly visitedChunks = new Set<string>();
  private readonly outposts: Outpost[] = [];

  constructor(options: WorldOptions) {
    this.seed = options.seed;
    const cfg = getConfig();
    this.bedrockY = cfg.terrain.bedrockY ?? -50;
    this.waterlineVoxelY = Math.floor(cfg.terrain.waterLevel);
    // V1: Start with a default outpost at 0, 0, 0? Or let loop handle it?
    // Let's add a default base at 0,0,0 if none exists, or rely on game init.
    // Ideally, "Base" is just an outpost.
    this.addOutpost(0, 10, 0); // Arbitrary start height?
  }

  addOutpost(x: number, y: number, z: number) {
    this.outposts.push({
      id: `outpost-${Date.now()}-${Math.random()}`,
      x,
      y,
      z,
      level: 1,
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

  requestDock(outpost: Outpost, droneId: number): DockResult {
    const MAX_SLOTS = 4; // Start with 4 slots
    
    // If already docked, keep it
    if (outpost.docked.has(droneId)) return "GRANTED";

    // If slots available and queue empty (or at front), allow
    if (outpost.docked.size < MAX_SLOTS) {
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

  key(x: number, y: number, z: number) {
    return voxelKey(x, y, z);
  }

  coordsFromKey(key: string) {
    return coordsFromVoxelKey(key);
  }

  baseMaterialAt(x: number, y: number, z: number) {
    const cfg = getConfig();
    return getBaseMaterialAt(x, y, z, this.seed, this.bedrockY, cfg);
  }

  materialAt(x: number, y: number, z: number) {
    const edit = this.edits.get(this.key(x, y, z));
    if (edit !== undefined) return edit;
    return this.baseMaterialAt(x, y, z);
  }

  private isFrontier(x: number, y: number, z: number) {
    if (this.materialAt(x, y, z) !== MATERIAL_SOLID) return false;
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
      if (this.materialAt(x + dx, y + dy, z + dz) === MATERIAL_AIR) return true;
    }
    return false;
  }

  private updateFrontierAt(x: number, y: number, z: number) {
    const key = this.key(x, y, z);
    if (this.isFrontier(x, y, z)) {
      this.frontierSolid.add(key);
      if (y >= this.waterlineVoxelY) {
        this.frontierAboveWater.add(key);
      } else {
        this.frontierAboveWater.delete(key);
      }
      return;
    }
    this.frontierSolid.delete(key);
    this.frontierAboveWater.delete(key);
  }

  private addFrontierColumn(
    x: number,
    z: number,
    cfg: Config,
    outAdded?: { x: number; y: number; z: number }[],
  ): number {
    // Get local height
    const y = getSurfaceHeightCore(
      x,
      z,
      this.seed,
      cfg.terrain.surfaceBias,
      cfg.terrain.quantizeScale,
    );
    if (y <= this.bedrockY) return 0;

    let aboveWaterAdded = 0;

    // Always add the surface voxel (it is exposed from above)
    const topKey = this.key(x, y, z);
    if (!this.frontierSolid.has(topKey)) {
      this.frontierSolid.add(topKey);
      if (outAdded) outAdded.push({ x, y, z });
      if (y >= this.waterlineVoxelY) {
        this.frontierAboveWater.add(topKey);
        aboveWaterAdded++;
      }
    }

    // Check neighbors to determine how deep the exposed wall goes
    let minNeighborY = y;

    const check = (nx: number, nz: number) => {
      const ny = getSurfaceHeightCore(
        nx,
        nz,
        this.seed,
        cfg.terrain.surfaceBias,
        cfg.terrain.quantizeScale,
      );
      if (ny < minNeighborY) minNeighborY = ny;
    };

    check(x + 1, z);
    check(x - 1, z);
    check(x, z + 1);
    check(x, z - 1);

    // If neighbors are lower, we have exposed sides.
    // Range: [minNeighborY + 1, y - 1]
    // (y is already added)

    const bottomY = Math.max(this.bedrockY + 1, minNeighborY + 1);

    for (let vy = y - 1; vy >= bottomY; vy--) {
      const vKey = this.key(x, vy, z);
      if (this.frontierSolid.has(vKey)) continue;

      this.frontierSolid.add(vKey);
      if (outAdded) outAdded.push({ x, y: vy, z });
      if (vy >= this.waterlineVoxelY) {
        this.frontierAboveWater.add(vKey);
        aboveWaterAdded++;
      }
    }
    return aboveWaterAdded;
  }

  initializeFrontierFromSurface(worldRadius: number) {
    this.frontierSolid.clear();
    this.frontierAboveWater.clear();
    this.visitedChunks.clear();
    let aboveWaterCount = 0;
    const cfg = getConfig();
    const chunkSize = cfg.terrain.chunkSize ?? 16;

    for (let x = -worldRadius; x <= worldRadius; x += 1) {
      for (let z = -worldRadius; z <= worldRadius; z += 1) {
        aboveWaterCount += this.addFrontierColumn(x, z, cfg);
      }
    }

    // Populate visitedChunks based on the generated radius.
    // Any chunk that is fully covered by worldRadius can be marked visited.
    // However, to be safe and simple (since this only happens on prestige),
    // we can just iterate the chunks we expect to be covered.
    // Actually, simpler: we don't mark anything visited here.
    // When ensureFrontierInChunk is called later for these chunks, it will check the voxels.
    // But ensureFrontierInChunk is expensive.
    // Let's iterate the chunks and if they are within radius-chunkSize, mark visited.
    const czr = Math.floor((worldRadius - chunkSize) / chunkSize);
    if (czr > 0) {
      for (let cx = -czr; cx <= czr; cx++) {
        for (let cz = -czr; cz <= czr; cz++) {
          this.visitedChunks.add(`${cx},${cz}`);
        }
      }
    }

    return aboveWaterCount;
  }

  ensureFrontierInChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    if (this.visitedChunks.has(key)) return null;
    this.visitedChunks.add(key);

    const cfg = getConfig();
    const chunkSize = cfg.terrain.chunkSize ?? 16;
    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;
    const endX = startX + chunkSize;
    const endZ = startZ + chunkSize;

    // Emit debugging info only in development to avoid noisy logs in CI/production
    if (process.env.NODE_ENV === "development") {
      debug(
        `[sim-world] ensureFrontierInChunk ${cx},${cz} range x=${startX}..${endX} z=${startZ}..${endZ}`,
      );
    }

    const added: { x: number; y: number; z: number }[] = [];

    for (let x = startX; x < endX; x++) {
      for (let z = startZ; z < endZ; z++) {
        this.addFrontierColumn(x, z, cfg, added);
      }
    }

    if (added.length > 0) {
      if (process.env.NODE_ENV === "development") {
        debug(`[sim-world] ensureFrontierInChunk ${cx},${cz} added ${added.length} voxels`);
      }
    }

    return added;
  }

  getFrontierKeys() {
    return Array.from(this.frontierSolid);
  }

  getFrontierPositionsArray() {
    const positions = new Float32Array(this.frontierSolid.size * 3);
    let idx = 0;
    for (const key of this.frontierSolid) {
      const coords = this.coordsFromKey(key);
      positions[idx] = coords.x;
      positions[idx + 1] = coords.y;
      positions[idx + 2] = coords.z;
      idx += 3;
    }
    return positions;
  }

  countFrontierAboveWater() {
    return this.frontierAboveWater.size;
  }

  mineVoxel(x: number, y: number, z: number) {
    const current = this.materialAt(x, y, z);
    if (current !== MATERIAL_SOLID) return null;
    if (y <= this.bedrockY) return null;

    if (!this.isFrontier(x, y, z)) return null;

    const edit: VoxelEdit = { x, y, z, mat: MATERIAL_AIR };
    this.edits.set(this.key(x, y, z), MATERIAL_AIR);

    const frontierAdded: { x: number; y: number; z: number }[] = [];
    const frontierRemoved: { x: number; y: number; z: number }[] = [];

    const update = (cx: number, cy: number, cz: number) => {
      const key = this.key(cx, cy, cz);
      const was = this.frontierSolid.has(key);
      this.updateFrontierAt(cx, cy, cz);
      const now = this.frontierSolid.has(key);
      if (was && !now) frontierRemoved.push({ x: cx, y: cy, z: cz });
      if (!was && now) frontierAdded.push({ x: cx, y: cy, z: cz });
    };

    for (const [dx, dy, dz] of FRONTIER_UPDATE_OFFSETS) {
      update(x + dx, y + dy, z + dz);
    }

    return { edit, frontierAdded, frontierRemoved };
  }
}
