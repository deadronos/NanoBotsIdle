import type { Config } from "../config/index";
import type { UiSnapshot, VoxelEdit } from "../shared/protocol";
import type { VoxelKey } from "../shared/voxel";
import type { Drone } from "./drones";
import type { KeyIndex } from "./keyIndex";
import {
  handleHaulerState,
  handleMinerState,
  type TickDronesContext,
} from "./tickDrones.handlers";
import type { Outpost, WorldModel } from "./world/world";

export const tickDrones = (options: {
  world: WorldModel;
  drones: Drone[];
  dtSeconds: number;
  cfg: Config;
  frontier: KeyIndex<VoxelKey>;
  minedKeys: Set<VoxelKey>;
  reservedKeys: Set<VoxelKey>;
  moveSpeed: number;
  mineDuration: number;
  maxTargetAttempts: number;
  uiSnapshot: UiSnapshot;
  minedPositions: number[];
  editsThisTick: VoxelEdit[];
  frontierAdded: number[];
  frontierRemoved: number[];
  depositEvents: { x: number; y: number; z: number; amount: number }[];
}) => {
  const { world, drones, uiSnapshot } = options;

  // Choose outpost using getBestOutpost if available; fall back to getNearestOutpost for test stubs
  const worldWithOptional = world as unknown as {
    getBestOutpost?: (x: number, y: number, z: number) => Outpost | null;
    getNearestOutpost: (x: number, y: number, z: number) => Outpost | null;
  };
  const pickOutpost = (
    worldWithOptional.getBestOutpost ?? worldWithOptional.getNearestOutpost
  ).bind(worldWithOptional);

  const context: TickDronesContext = {
    ...options,
    pickOutpost,
  };

  for (const drone of drones) {
    if (drone.role === "MINER") {
      handleMinerState(drone, context);
    } else if (drone.role === "HAULER") {
      handleHaulerState(drone, context);
    }
  }

  uiSnapshot.totalBlocks = world.countFrontierAboveWater();
};
