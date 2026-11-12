import { getDroneMoveSpeed, getMineDuration } from "../config/drones";
import { inMiningZone } from "../shared/miningOperations";
import type { RenderDelta, UiSnapshot, VoxelEdit } from "../shared/protocol";
import { VOXEL_COORD_MAX, VOXEL_COORD_MIN, voxelKey } from "../shared/voxel";
import { forEachRadialChunk } from "../utils";
import type { EngineContext } from "./context";
import { syncDroneCount } from "./drones";
import { encodeDrones, toFloat32ArrayOrUndefined } from "./encode";
import { addKey } from "./keyIndex";
import { tickDrones } from "./tickDrones";

const INCOME_WINDOW_SECONDS = 60;

const updateEconomyReadout = (ctx: EngineContext, deposited: number): void => {
  const { depositIncome, elapsedSeconds, uiSnapshot } = ctx;
  const { samples } = depositIncome;
  if (depositIncome.prestigeLevel !== uiSnapshot.prestigeLevel) {
    depositIncome.prestigeLevel = uiSnapshot.prestigeLevel;
    samples.length = 0;
    depositIncome.total = 0;
  }

  const cutoff = elapsedSeconds - INCOME_WINDOW_SECONDS;
  let expired = 0;
  while (expired < samples.length && samples[expired].at <= cutoff) {
    depositIncome.total -= samples[expired].amount;
    expired += 1;
  }
  if (expired > 0) samples.splice(0, expired);
  if (samples.length === 0) depositIncome.total = 0;
  if (deposited > 0) {
    samples.push({ at: elapsedSeconds, amount: deposited });
    depositIncome.total += deposited;
  }

  uiSnapshot.creditsPerMinute = depositIncome.total;
  // Sum after every drone has updated so a miner-to-hauler transfer is counted once.
  let cargo = 0;
  for (const drone of ctx.drones) cargo += drone.payload;
  uiSnapshot.cargoInTransit = cargo;
};

export const tickEngine = (
  ctx: EngineContext,
  dtSeconds: number,
  _budgetMs: number,
  _maxSubsteps: number,
): { delta: RenderDelta; ui: UiSnapshot; backlog: number } => {
  ctx.tick += 1;
  ctx.elapsedSeconds += dtSeconds;
  ctx.drones = syncDroneCount(
    ctx.drones,
    ctx.uiSnapshot.droneCount,
    ctx.uiSnapshot.haulerCount,
    ctx.cfg,
    ctx.world?.getOutposts()[0],
  );

  const moveSpeed = getDroneMoveSpeed(ctx.uiSnapshot.moveSpeedLevel, ctx.cfg);
  const mineDuration = getMineDuration(ctx.uiSnapshot.miningSpeedLevel, ctx.cfg);
  const minedPositions: number[] = [];
  const editsThisTick: VoxelEdit[] = [];
  const frontierAdded: number[] = [];
  const frontierRemoved: number[] = [];
  const depositEvents: { x: number; y: number; z: number; amount: number }[] = [];
  const debugChunksProcessed: string[] = [];
  const debugQueueLengthAtTickStart = ctx.playerChunksToScan.length;

  // Max target attempts hardcoded in original
  const maxTargetAttempts = 20;

  const w = ctx.world;
  let deposited = 0;
  if (w) {
    // Process player frontier expansion
    while (ctx.playerChunksToScan.length > 0) {
      const pc = ctx.playerChunksToScan.shift();
      if (pc) {
        const r = 2; // radius of chunks to auto-frontier
        const size = ctx.cfg.terrain.chunkSize ?? 16;
        forEachRadialChunk({ cx: pc.cx, cy: pc.cy, cz: pc.cz }, r, 2, (c) => {
          if (
            c.cx * size < VOXEL_COORD_MIN ||
            (c.cx + 1) * size - 1 > VOXEL_COORD_MAX ||
            c.cz * size < VOXEL_COORD_MIN ||
            (c.cz + 1) * size - 1 > VOXEL_COORD_MAX
          )
            return;
          const added = w.ensureFrontierInChunk(c.cx, c.cz);
          debugChunksProcessed.push(`${c.cx},${c.cz}:${added ? added.length : "skip"}`);
          if (added && added.length > 0) {
            for (const pos of added) {
              const key = voxelKey(pos.x, pos.y, pos.z);
              addKey(ctx.frontier, key);
              if (
                ctx.zoneFrontier &&
                ctx.uiSnapshot.miningZone &&
                inMiningZone(ctx.uiSnapshot.miningZone, pos.x, pos.z) &&
                pos.y >= Math.floor(ctx.cfg.terrain.waterLevel) &&
                !w.isStarterFoundation(pos.x, pos.z)
              ) {
                addKey(ctx.zoneFrontier, key);
              }
              frontierAdded.push(pos.x, pos.y, pos.z);
            }
          }
        });
      }
    }

    deposited = tickDrones({
      world: w,
      drones: ctx.drones,
      dtSeconds,
      cfg: ctx.cfg,
      frontier: ctx.frontier,
      zoneFrontier: ctx.zoneFrontier,
      minedKeys: ctx.minedKeys,
      reservedKeys: ctx.reservedKeys,
      moveSpeed,
      mineDuration,
      maxTargetAttempts,
      uiSnapshot: ctx.uiSnapshot,
      minedPositions,
      editsThisTick,
      frontierAdded,
      frontierRemoved,
      depositEvents,
      elapsedSeconds: ctx.elapsedSeconds,
    });
  }

  updateEconomyReadout(ctx, deposited);
  const encoded = encodeDrones(ctx.drones);
  if (ctx.zoneFrontier) {
    ctx.uiSnapshot.zoneTargets = ctx.zoneFrontier.keys.length;
    let assigned = 0;
    for (const drone of ctx.drones) {
      if (
        drone.role === "MINER" &&
        typeof drone.targetKey === "number" &&
        ctx.zoneFrontier.index.has(drone.targetKey)
      )
        assigned++;
    }
    ctx.uiSnapshot.zoneAssigned = assigned;
  } else {
    ctx.uiSnapshot.zoneTargets = undefined;
    ctx.uiSnapshot.zoneAssigned = undefined;
  }

  const delta: RenderDelta = {
    tick: ctx.tick,
    ...encoded,
    edits: editsThisTick.length > 0 ? editsThisTick : undefined,
    minedPositions: toFloat32ArrayOrUndefined(minedPositions),
    frontierAdd: toFloat32ArrayOrUndefined(frontierAdded),
    frontierRemove: toFloat32ArrayOrUndefined(frontierRemoved),
    debugChunksProcessed: debugChunksProcessed.length > 0 ? debugChunksProcessed : undefined,
    debugQueueLengthAtTickStart,
    outposts: w?.getOutposts().map(({ id, x, y, z, level, docked, queue }) => ({
      id,
      x,
      y,
      z,
      level,
      dockedCount: docked?.size ?? 0,
      queuedCount: queue?.length ?? 0,
    })),
    depositEvents: depositEvents.length > 0 ? depositEvents : undefined,
  };

  ctx.uiSnapshot.outposts = delta.outposts ?? [];

  if (ctx.pendingFrontierSnapshot) {
    // Merge pendingFrontierSnapshot with any incremental frontierAdded (don't discard incremental updates!)
    if (frontierAdded.length > 0) {
      const merged = new Float32Array(ctx.pendingFrontierSnapshot.length + frontierAdded.length);
      merged.set(ctx.pendingFrontierSnapshot, 0);
      merged.set(new Float32Array(frontierAdded), ctx.pendingFrontierSnapshot.length);
      delta.frontierAdd = merged;
    } else {
      delta.frontierAdd = ctx.pendingFrontierSnapshot;
    }
    delta.frontierReset = ctx.pendingFrontierReset;
    ctx.pendingFrontierSnapshot = null;
    ctx.pendingFrontierReset = false;
  }

  return {
    delta,
    ui: ctx.uiSnapshot,
    backlog: 0,
  };
};
