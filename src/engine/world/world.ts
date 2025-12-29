import { getConfig } from "../../config/index";
import { getSurfaceHeight } from "../../sim/terrain";

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

  constructor(options: WorldOptions) {
    this.seed = options.seed;
    const cfg = getConfig();
    this.bedrockY = cfg.terrain.bedrockY ?? -50;
  }

  key(x: number, y: number, z: number) {
    return `${x},${y},${z}`;
  }

  baseMaterialAt(x: number, y: number, z: number) {
    if (y <= this.bedrockY) return MATERIAL_BEDROCK;
    const surfaceY = getSurfaceHeight(x, z, this.seed);
    if (y <= surfaceY) return MATERIAL_SOLID;
    return MATERIAL_AIR;
  }

  materialAt(x: number, y: number, z: number) {
    const edit = this.edits.get(this.key(x, y, z));
    if (edit !== undefined) return edit;
    return this.baseMaterialAt(x, y, z);
  }

  mineVoxel(x: number, y: number, z: number): VoxelEdit | null {
    const current = this.materialAt(x, y, z);
    if (current !== MATERIAL_SOLID) return null;
    if (y <= this.bedrockY) return null;

    const hasAirNeighbor =
      this.materialAt(x + 1, y, z) === MATERIAL_AIR ||
      this.materialAt(x - 1, y, z) === MATERIAL_AIR ||
      this.materialAt(x, y + 1, z) === MATERIAL_AIR ||
      this.materialAt(x, y - 1, z) === MATERIAL_AIR ||
      this.materialAt(x, y, z + 1) === MATERIAL_AIR ||
      this.materialAt(x, y, z - 1) === MATERIAL_AIR;

    if (!hasAirNeighbor) return null;

    const edit: VoxelEdit = { x, y, z, mat: MATERIAL_AIR };
    this.edits.set(this.key(x, y, z), MATERIAL_AIR);
    return edit;
  }
}
