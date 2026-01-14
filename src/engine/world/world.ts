import { type Config, getConfig } from "../../config/index";
import type { VoxelEdit } from "../../shared/protocol";
import {
  coordsFromVoxelKey,
  MATERIAL_AIR,
  MATERIAL_BEDROCK,
  MATERIAL_SOLID,
  type VoxelKey,
  voxelKey,
} from "../../shared/voxel";
import { VoxelEditStore } from "../../shared/voxelEdits";
import { getBaseMaterialAt } from "../../sim/voxelBaseMaterial";
import { FrontierManager, type VoxelReader } from "./FrontierManager";
import { type DockResult, type Outpost, OutpostManager } from "./OutpostManager";

export { MATERIAL_AIR, MATERIAL_BEDROCK, MATERIAL_SOLID };
export type { Outpost, DockResult };

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

export class WorldModel implements VoxelReader {
  private readonly seed: number;
  private readonly edits = new VoxelEditStore();
  private readonly bedrockY: number;

  private readonly frontierManager: FrontierManager;
  private readonly outpostManager: OutpostManager;

  constructor(options: WorldOptions) {
    this.seed = options.seed;
    const cfg = getConfig();
    this.bedrockY = cfg.terrain.bedrockY ?? -50;
    const waterlineVoxelY = Math.floor(cfg.terrain.waterLevel);

    this.frontierManager = new FrontierManager(this.seed, this.bedrockY, waterlineVoxelY);
    this.outpostManager = new OutpostManager();

    // V1: Start with a default outpost at 0, 0, 0
    this.outpostManager.addOutpost(0, 10, 0);
  }

  addOutpost(x: number, y: number, z: number) {
    this.outpostManager.addOutpost(x, y, z);
  }

  getOutposts() {
    return this.outpostManager.getOutposts();
  }

  getNearestOutpost(x: number, y: number, z: number): Outpost | null {
    return this.outpostManager.getNearestOutpost(x, y, z);
  }

  getBestOutpost(x: number, y: number, z: number): Outpost | null {
    return this.outpostManager.getBestOutpost(x, y, z);
  }

  requestDock(outpost: Outpost, droneId: number): DockResult {
    return this.outpostManager.requestDock(outpost, droneId);
  }

  undock(outpost: Outpost, droneId: number) {
    this.outpostManager.undock(outpost, droneId);
  }

  getQueueLength(outpost: Outpost) {
    return this.outpostManager.getQueueLength(outpost);
  }

  key(x: number, y: number, z: number): VoxelKey {
    return voxelKey(x, y, z);
  }

  coordsFromKey(key: VoxelKey) {
    return coordsFromVoxelKey(key);
  }

  baseMaterialAt(x: number, y: number, z: number) {
    const cfg = getConfig();
    return getBaseMaterialAt(x, y, z, this.seed, this.bedrockY, cfg);
  }

  materialAt(x: number, y: number, z: number) {
    if (this.edits.hasAirEdit(x, y, z)) return MATERIAL_AIR;
    return this.baseMaterialAt(x, y, z);
  }

  initializeFrontierFromSurface(worldRadius: number) {
    return this.frontierManager.initializeFrontierFromSurface(worldRadius);
  }

  ensureFrontierInChunk(cx: number, cz: number) {
    return this.frontierManager.ensureFrontierInChunk(cx, cz);
  }

  getFrontierKeys(): VoxelKey[] {
    return this.frontierManager.getFrontierKeys();
  }

  getFrontierPositionsArray() {
    return this.frontierManager.getFrontierPositionsArray();
  }

  countFrontierAboveWater() {
    return this.frontierManager.countFrontierAboveWater();
  }

  mineVoxel(x: number, y: number, z: number) {
    const current = this.materialAt(x, y, z);
    if (current !== MATERIAL_SOLID) return null;
    if (y <= this.bedrockY) return null;

    if (!this.frontierManager.hasFrontier(x, y, z)) return null;

    const edit: VoxelEdit = { x, y, z, mat: MATERIAL_AIR };
    this.edits.setMaterial(x, y, z, MATERIAL_AIR);

    const frontierAdded: { x: number; y: number; z: number }[] = [];
    const frontierRemoved: { x: number; y: number; z: number }[] = [];

    const update = (cx: number, cy: number, cz: number) => {
      const key = this.key(cx, cy, cz);
      const was = this.frontierManager.hasFrontier(cx, cy, cz);
      this.frontierManager.updateFrontierAt(this, cx, cy, cz);
      const now = this.frontierManager.hasFrontier(cx, cy, cz);
      if (was && !now) frontierRemoved.push({ x: cx, y: cy, z: cz });
      if (!was && now) frontierAdded.push({ x: cx, y: cy, z: cz });
    };

    for (const [dx, dy, dz] of FRONTIER_UPDATE_OFFSETS) {
      update(x + dx, y + dy, z + dz);
    }

    return { edit, frontierAdded, frontierRemoved };
  }
}
