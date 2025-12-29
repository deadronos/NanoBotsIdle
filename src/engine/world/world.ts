import { getConfig } from "../../config/index";
import { getSurfaceHeightCore } from "../../sim/terrain-core";

export const MATERIAL_AIR = 0;
export const MATERIAL_SOLID = 1;
export const MATERIAL_BEDROCK = 2;

export type VoxelEdit = {
  x: number;
  y: number;
  z: number;
  mat: number;
};

type WorldOptions = {
  seed: number;
};

export class WorldModel {
  private readonly seed: number;
  private readonly edits = new Map<string, number>();
  private readonly bedrockY: number;
  private readonly waterlineVoxelY: number;
  private readonly frontierSolid = new Set<string>();
  private readonly frontierAboveWater = new Set<string>();

  constructor(options: WorldOptions) {
    this.seed = options.seed;
    const cfg = getConfig();
    this.bedrockY = cfg.terrain.bedrockY ?? -50;
    this.waterlineVoxelY = Math.floor(cfg.terrain.waterLevel);
  }

  key(x: number, y: number, z: number) {
    return `${x},${y},${z}`;
  }

  coordsFromKey(key: string) {
    const [x, y, z] = key.split(",").map((value) => Number(value));
    return { x, y, z };
  }

  baseMaterialAt(x: number, y: number, z: number) {
    if (y <= this.bedrockY) return MATERIAL_BEDROCK;
    const cfg = getConfig();
    const surfaceY = getSurfaceHeightCore(
      x,
      z,
      this.seed,
      cfg.terrain.surfaceBias,
      cfg.terrain.quantizeScale,
    );
    if (y <= surfaceY) return MATERIAL_SOLID;
    return MATERIAL_AIR;
  }

  materialAt(x: number, y: number, z: number) {
    const edit = this.edits.get(this.key(x, y, z));
    if (edit !== undefined) return edit;
    return this.baseMaterialAt(x, y, z);
  }

  private isFrontier(x: number, y: number, z: number) {
    if (this.materialAt(x, y, z) !== MATERIAL_SOLID) return false;
    return (
      this.materialAt(x + 1, y, z) === MATERIAL_AIR ||
      this.materialAt(x - 1, y, z) === MATERIAL_AIR ||
      this.materialAt(x, y + 1, z) === MATERIAL_AIR ||
      this.materialAt(x, y - 1, z) === MATERIAL_AIR ||
      this.materialAt(x, y, z + 1) === MATERIAL_AIR ||
      this.materialAt(x, y, z - 1) === MATERIAL_AIR
    );
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

  initializeFrontierFromSurface(worldRadius: number) {
    this.frontierSolid.clear();
    this.frontierAboveWater.clear();
    let aboveWaterCount = 0;
    const cfg = getConfig();

    for (let x = -worldRadius; x <= worldRadius; x += 1) {
      for (let z = -worldRadius; z <= worldRadius; z += 1) {
        const surfaceY = getSurfaceHeightCore(
          x,
          z,
          this.seed,
          cfg.terrain.surfaceBias,
          cfg.terrain.quantizeScale,
        );
        if (surfaceY <= this.bedrockY) continue;
        const key = this.key(x, surfaceY, z);
        this.frontierSolid.add(key);
        if (surfaceY >= this.waterlineVoxelY) {
          this.frontierAboveWater.add(key);
          aboveWaterCount += 1;
        }
      }
    }

    return aboveWaterCount;
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

    update(x, y, z);
    update(x + 1, y, z);
    update(x - 1, y, z);
    update(x, y + 1, z);
    update(x, y - 1, z);
    update(x, y, z + 1);
    update(x, y, z - 1);

    return { edit, frontierAdded, frontierRemoved };
  }
}
