import { type Config, getConfig } from "../../config/index";
import {
  coordsFromVoxelKey,
  MATERIAL_AIR,
  MATERIAL_SOLID,
  type VoxelKey,
  voxelKey,
} from "../../shared/voxel";
import { getSurfaceHeightCore } from "../../sim/terrain-core";
import { debug } from "../../utils/logger";

const NEIGHBOR_OFFSETS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

export interface VoxelReader {
  materialAt(x: number, y: number, z: number): number;
}

export class FrontierManager {
  private readonly frontierSolid = new Set<VoxelKey>();
  private readonly frontierAboveWater = new Set<VoxelKey>();
  private readonly visitedChunks = new Set<string>();
  private readonly seed: number;
  private readonly bedrockY: number;
  private readonly waterlineVoxelY: number;

  constructor(seed: number, bedrockY: number, waterlineVoxelY: number) {
    this.seed = seed;
    this.bedrockY = bedrockY;
    this.waterlineVoxelY = waterlineVoxelY;
  }

  key(x: number, y: number, z: number): VoxelKey {
    return voxelKey(x, y, z);
  }

  coordsFromKey(key: VoxelKey) {
    return coordsFromVoxelKey(key);
  }

  private isFrontier(reader: VoxelReader, x: number, y: number, z: number) {
    if (reader.materialAt(x, y, z) !== MATERIAL_SOLID) return false;
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
      if (reader.materialAt(x + dx, y + dy, z + dz) === MATERIAL_AIR) return true;
    }
    return false;
  }

  updateFrontierAt(reader: VoxelReader, x: number, y: number, z: number) {
    const key = this.key(x, y, z);
    if (this.isFrontier(reader, x, y, z)) {
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

  getFrontierKeys(): VoxelKey[] {
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

  hasFrontier(x: number, y: number, z: number): boolean {
    return this.frontierSolid.has(this.key(x, y, z));
  }
}
