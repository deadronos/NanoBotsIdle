import { getDroneMoveSpeed, getMineDuration } from "../config/drones";
import type { RenderDelta, UiSnapshot, VoxelEdit } from "../shared/protocol";
import { voxelKey } from "../shared/voxel";
import { forEachRadialChunk } from "../utils";
import type { EngineContext } from "./context";
import { syncDroneCount } from "./drones";
import { encodeDrones, toFloat32ArrayOrUndefined } from "./encode";
import { addKey } from "./keyIndex";
import { tickDrones } from "./tickDrones";

export const tickEngine = (
  ctx: EngineContext,
  dtSeconds: number,
  _budgetMs: number,
  _maxSubsteps: number,
): { delta: RenderDelta; ui: UiSnapshot; backlog: number } => {
  ctx.tick += 1;
  ctx.drones = syncDroneCount(
    ctx.drones,
    ctx.uiSnapshot.droneCount,
    ctx.uiSnapshot.haulerCount,
    ctx.cfg,
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
  if (w) {
    // Process player frontier expansion
    while (ctx.playerChunksToScan.length > 0) {
      const pc = ctx.playerChunksToScan.shift();
      if (pc) {
        const r = 2; // radius of chunks to auto-frontier
        forEachRadialChunk({ cx: pc.cx, cy: pc.cy, cz: pc.cz }, r, 2, (c) => {
          const added = w.ensureFrontierInChunk(c.cx, c.cz);
          debugChunksProcessed.push(`${c.cx},${c.cz}:${added ? added.length : "skip"}`);
          if (added && added.length > 0) {
            for (const pos of added) {
              addKey(ctx.frontier, voxelKey(pos.x, pos.y, pos.z));
              frontierAdded.push(pos.x, pos.y, pos.z);
            }
          }
        });
      }
    }

    tickDrones({
      world: w,
      drones: ctx.drones,
      dtSeconds,
      cfg: ctx.cfg,
      frontier: ctx.frontier,
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
    });
  }

  const { entities, entityTargets, entityStates } = encodeDrones(ctx.drones);

  const delta: RenderDelta = {
    tick: ctx.tick,
    entities,
    entityTargets,
    entityStates,
    edits: editsThisTick.length > 0 ? editsThisTick : undefined,
    minedPositions: toFloat32ArrayOrUndefined(minedPositions),
    frontierAdd: toFloat32ArrayOrUndefined(frontierAdded),
    frontierRemove: toFloat32ArrayOrUndefined(frontierRemoved),
    debugChunksProcessed: debugChunksProcessed.length > 0 ? debugChunksProcessed : undefined,
    debugQueueLengthAtTickStart,
    outposts: w?.getOutposts(),
    depositEvents: depositEvents.length > 0 ? depositEvents : undefined,
  };

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
