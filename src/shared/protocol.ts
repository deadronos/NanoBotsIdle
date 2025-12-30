export type Cmd =
  | { t: "BUY_UPGRADE"; id: string; n: number }
  | { t: "PRESTIGE" }
  | { t: "CLICK_VOXEL"; x: number; y: number; z: number }
  | { t: "SET_TOOL"; tool: "mine" | "build" }
  | { t: "SET_PLAYER_CHUNK"; cx: number; cy: number; cz: number }
  | { t: "REQUEST_FRONTIER_SNAPSHOT" };

export type VoxelEdit = {
  x: number;
  y: number;
  z: number;
  mat: number;
};

export type RenderDelta = {
  tick: number;
  entities?: Float32Array;
  entityTargets?: Float32Array;
  entityStates?: Uint8Array;
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
};

export type UiSnapshot = {
  credits: number;
  prestigeLevel: number;
  droneCount: number;
  miningSpeedLevel: number;
  moveSpeedLevel: number;
  laserPowerLevel: number;
  minedBlocks: number;
  totalBlocks: number;
  upgrades: Record<string, number>;
  nextCosts?: Record<string, number>;
  actualSeed?: number;
};

export type ToWorker =
  | { t: "INIT"; seed?: number }
  | {
      t: "STEP";
      frameId: number;
      nowMs: number;
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
