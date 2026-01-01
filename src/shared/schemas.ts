import { z } from "zod";

// --- Primitives ---

export const CmdSchema = z.union([
  z.object({ t: z.literal("BUY_UPGRADE"), id: z.string(), n: z.number() }),
  z.object({ t: z.literal("PRESTIGE") }),
  z.object({ t: z.literal("CLICK_VOXEL"), x: z.number(), y: z.number(), z: z.number() }),
  z.object({ t: z.literal("SET_TOOL"), tool: z.union([z.literal("mine"), z.literal("build")]) }),
  z.object({
    t: z.literal("SET_PLAYER_CHUNK"),
    cx: z.number(),
    cy: z.number(),
    cz: z.number(),
  }),
  z.object({ t: z.literal("REQUEST_FRONTIER_SNAPSHOT") }),
  z.object({ t: z.literal("BUILD_OUTPOST"), x: z.number(), y: z.number(), z: z.number() }),
]);

export const VoxelEditSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  mat: z.number(),
});

export const RenderDeltaSchema = z.object({
  tick: z.number(),
  entities: z.instanceof(Float32Array).optional(),
  entityTargets: z.instanceof(Float32Array).optional(),
  entityStates: z.instanceof(Uint8Array).optional(),
  entityRoles: z.instanceof(Uint8Array).optional(),
  edits: z.array(VoxelEditSchema).optional(),
  minedPositions: z.instanceof(Float32Array).optional(),
  frontierAdd: z.instanceof(Float32Array).optional(),
  frontierRemove: z.instanceof(Float32Array).optional(),
  frontierReset: z.boolean().optional(),
  debugChunksProcessed: z.array(z.string()).optional(),
  debugQueueLengthAtTickStart: z.number().optional(),
  effects: z
    .array(
      z.object({
        kind: z.literal("beam"),
        fromId: z.number(),
        toX: z.number(),
        toY: z.number(),
        toZ: z.number(),
        ttl: z.number(),
      }),
    )
    .optional(),
  outposts: z
    .array(
      z.object({
        id: z.string(),
        x: z.number(),
        y: z.number(),
        z: z.number(),
        level: z.number(),
      }),
    )
    .optional(),
  depositEvents: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
        amount: z.number(),
      }),
    )
    .optional(),
});

export const UiSnapshotSchema = z.object({
  credits: z.number(),
  prestigeLevel: z.number(),
  droneCount: z.number(),
  haulerCount: z.number(),
  miningSpeedLevel: z.number(),
  moveSpeedLevel: z.number(),
  laserPowerLevel: z.number(),
  minedBlocks: z.number(),
  totalBlocks: z.number(),
  upgrades: z.record(z.string(), z.number()),
  outposts: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      z: z.number(),
      level: z.number(),
    }),
  ),
  nextCosts: z.record(z.string(), z.number()).optional(),
  actualSeed: z.number().optional(),
});

// --- Worker Messages ---

export const ToWorkerSchema = z.union([
  z.object({
    t: z.literal("INIT"),
    seed: z.number().optional(),
    saveState: UiSnapshotSchema.partial().optional(),
  }),
  z.object({
    t: z.literal("STEP"),
    frameId: z.number(),
    nowMs: z.number(),
    budgetMs: z.number(),
    maxSubsteps: z.number(),
    cmds: z.array(CmdSchema),
  }),
]);

export const FromWorkerSchema = z.union([
  z.object({ t: z.literal("READY") }),
  z.object({
    t: z.literal("FRAME"),
    frameId: z.number(),
    delta: RenderDeltaSchema,
    ui: UiSnapshotSchema,
    stats: z.object({ simMs: z.number(), backlog: z.number() }).optional(),
  }),
  z.object({ t: z.literal("ERROR"), message: z.string() }),
]);
