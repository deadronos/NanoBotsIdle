import type { LandingProfile, MiningZone } from "./miningOperations";

export type Cmd =
  | { t: "BUY_UPGRADE"; id: string; n: number }
  | { t: "PRESTIGE"; landing?: LandingProfile }
  | { t: "SET_MINING_ZONE"; zone: MiningZone }
  | { t: "CLEAR_MINING_ZONE" }
  | { t: "CLICK_VOXEL"; x: number; y: number; z: number }
  | { t: "SET_TOOL"; tool: "mine" | "build" }
  | { t: "SET_PLAYER_CHUNK"; cx: number; cy: number; cz: number }
  | { t: "REQUEST_FRONTIER_SNAPSHOT" }
  | { t: "BUILD_OUTPOST"; x: number; y: number; z: number };

export type VoxelEdit = {
  x: number;
  y: number;
  z: number;
  mat: number;
};

export type OutpostSnapshot = {
  id: string;
  x: number;
  y: number;
  z: number;
  level: number;
  dockedCount?: number;
  queuedCount?: number;
};

export type RenderDelta = {
  tick: number;
  entities?: Float32Array;
  entityTargets?: Float32Array;
  entityStates?: Uint8Array;
  entityRoles?: Uint8Array;
  entityCargo?: Float32Array;
  returnRoutes?: Float32Array;
  edits?: VoxelEdit[];
  minedPositions?: Float32Array;
  frontierAdd?: Float32Array;
  frontierRemove?: Float32Array;
  frontierReset?: boolean;
  debugChunksProcessed?: string[]; // Debug: list of chunks processed this tick
  debugQueueLengthAtTickStart?: number; // Debug: queue length at tick start
  effects?: {
    kind: "beam";
    fromId: number;
    toX: number;
    toY: number;
    toZ: number;
    ttl: number;
  }[];
  depositEvents?: DepositEvent[];
  outposts?: OutpostSnapshot[];
};

export type DepositEvent = {
  x: number;
  y: number;
  z: number;
  amount: number;
};

export type UiSnapshot = {
  credits: number;
  creditsPerMinute: number;
  cargoInTransit: number;
  prestigeLevel: number;
  droneCount: number;
  haulerCount: number;
  miningSpeedLevel: number;
  moveSpeedLevel: number;
  laserPowerLevel: number;
  minedBlocks: number;
  totalBlocks: number;
  outposts: OutpostSnapshot[];
  nextCosts?: Record<string, number>;
  actualSeed?: number;
  landingProfile?: LandingProfile;
  miningZone?: MiningZone;
  zoneTargets?: number;
  zoneAssigned?: number;
  landingSpawn?: { x: number; y: number; z: number };
};

export type ToWorker =
  | { t: "INIT"; seed?: number; saveState?: Partial<UiSnapshot> }
  | {
      t: "STEP";
      frameId: number;
      nowMs: number;
      resetClock?: boolean;
      budgetMs: number;
      maxSubsteps: number;
      cmds: Cmd[];
    };

export type FromWorker =
  | { t: "READY" }
  | {
      t: "FRAME";
      frameId: number;
      delta: RenderDelta;
      ui: UiSnapshot;
      stats?: { simMs: number; backlog: number };
    }
  | { t: "ERROR"; message: string };
