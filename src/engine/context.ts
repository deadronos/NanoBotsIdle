import type { Config } from "../config/index";
import type { UiSnapshot } from "../shared/protocol";
import type { VoxelKey } from "../shared/voxel";
import type { Drone } from "./drones";
import type { KeyIndex } from "./keyIndex";
import type { WorldModel } from "./world/world";

export interface EngineContext {
  tick: number;
  cfg: Config;
  minedKeys: Set<VoxelKey>;
  reservedKeys: Set<VoxelKey>;
  world: WorldModel | null;
  frontier: KeyIndex<VoxelKey>;
  pendingFrontierSnapshot: Float32Array | null;
  pendingFrontierReset: boolean;
  drones: Drone[];
  playerChunksToScan: { cx: number; cy: number; cz: number }[];
  uiSnapshot: UiSnapshot;
}
