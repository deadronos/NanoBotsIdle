/* eslint-disable simple-import-sort/imports */
import { getDroneMoveSpeed, getMineDuration } from "../config/drones";
import { getConfig } from "../config/index";
import { computeNextUpgradeCosts, tryBuyUpgrade, type UpgradeType } from "../economy/upgrades";
import type { Cmd, RenderDelta, UiSnapshot, VoxelEdit } from "../shared/protocol";
import { voxelKey } from "../shared/voxel";
import { forEachRadialChunk } from "../utils";
import { debug } from "../utils/logger";

import { type Drone, syncDroneCount } from "./drones";
import { encodeDrones, toFloat32ArrayOrUndefined } from "./encode";
import { addKey, createKeyIndex, resetKeyIndex } from "./keyIndex";
import { tickDrones } from "./tickDrones";
import { initWorldForPrestige } from "./world/initWorld";
import type { WorldModel } from "./world/world";

export type Engine = {
  dispatch: (cmd: Cmd) => void;
  tick: (
    dtSeconds: number,
    budgetMs: number,
    maxSubsteps: number,
  ) => { delta: RenderDelta; ui: UiSnapshot; backlog: number };
};

export const createEngine = (_seed?: number, saveState?: Partial<UiSnapshot>): Engine => {
  let tick = 0;
  const cfg = getConfig();
  const maxTargetAttempts = 20;
  const minedKeys = new Set<string>();
  const reservedKeys = new Set<string>();
  let world: WorldModel | null = null;
  void _seed;
  const frontier = createKeyIndex();
  let pendingFrontierSnapshot: Float32Array | null = null;
  let pendingFrontierReset = false;

  let drones: Drone[] = [];
  const playerChunksToScan: { cx: number; cy: number; cz: number }[] = [];

  const uiSnapshot: UiSnapshot = {
    credits: saveState?.credits ?? 0,
    prestigeLevel: saveState?.prestigeLevel ?? 1,
    droneCount: saveState?.droneCount ?? 3,
    haulerCount: saveState?.haulerCount ?? 0,
    miningSpeedLevel: saveState?.miningSpeedLevel ?? 1,
    moveSpeedLevel: saveState?.moveSpeedLevel ?? 1,
    laserPowerLevel: saveState?.laserPowerLevel ?? 1,
    minedBlocks: saveState?.minedBlocks ?? 0,
    totalBlocks: 0,
    upgrades: saveState?.upgrades ?? {},
    outposts: [],
  };

  const updateNextCosts = () => {
    uiSnapshot.nextCosts = computeNextUpgradeCosts(uiSnapshot, cfg);
  };

  updateNextCosts();

  const resetTargets = () => {
    minedKeys.clear();
    reservedKeys.clear();
  };

  const ensureSeedWithMinAboveWater = (prestigeLevel: number) => {
    const result = initWorldForPrestige(prestigeLevel, cfg);
    world = result.world;
    resetKeyIndex(frontier, result.frontierKeys);
    uiSnapshot.totalBlocks = result.aboveWaterCount;
    uiSnapshot.actualSeed = result.actualSeed;
    pendingFrontierSnapshot = result.frontierPositions;
    pendingFrontierReset = true;
  };

  ensureSeedWithMinAboveWater(uiSnapshot.prestigeLevel);

  // Hydrate outposts
  if (saveState?.outposts) {
    saveState.outposts.forEach((op) => {
      // Avoid adding the default one if it's already in the list?
      // Default one is added by World constructor?
      // Check duplicate?
      // Actually World constructor adds (0,10,0).
      // If save has it, we might duplicate.
      // Let's rely on validation in addOutpost or just add.
      // But wait, addOutpost pushes to array.
      // If we respect saveState, maybe we should CLEAR defaults?
      // But world is inside initWorldForPrestige...
      // Let's assume saveState has EVERYTHING.
      // So duplicated default is risk.
      // Better: filter duplicates by ID or distance?
      if (world && !world.getOutposts().find((e) => e.x === op.x && e.y === op.y && e.z === op.z)) {
        world.addOutpost(op.x, op.y, op.z);
      }
    });
  }

  const isUpgradeType = (id: string): id is UpgradeType =>
    id === "drone" || id === "hauler" || id === "speed" || id === "move" || id === "laser";

  const dispatch = (cmd: Cmd) => {
    switch (cmd.t) {
      case "BUY_UPGRADE": {
        if (!isUpgradeType(cmd.id)) return;
        const count = Math.max(1, cmd.n);
        for (let i = 0; i < count; i += 1) {
          tryBuyUpgrade(cmd.id, uiSnapshot, cfg);
        }
        updateNextCosts();
        return;
      }
      case "PRESTIGE": {
        if (uiSnapshot.minedBlocks < cfg.economy.prestigeMinMinedBlocks) return;
        uiSnapshot.credits = 0;
        uiSnapshot.minedBlocks = 0;
        uiSnapshot.totalBlocks = 0;
        uiSnapshot.prestigeLevel += 1;
        resetTargets();
        ensureSeedWithMinAboveWater(uiSnapshot.prestigeLevel);
        return;
      }
      case "SET_PLAYER_CHUNK": {
        // Debug-only logging to avoid noisy output in production/CI

        if (process.env.NODE_ENV === "development") {
          debug(
            `[engine] SET_PLAYER_CHUNK cx=${cmd.cx} cy=${cmd.cy} cz=${cmd.cz}, queue size before: ${playerChunksToScan.length}`,
          );
        }
        playerChunksToScan.push({ cx: cmd.cx, cy: cmd.cy, cz: cmd.cz });
        return;
      }
      case "REQUEST_FRONTIER_SNAPSHOT": {
        const w = world;
        if (!w) return;
        pendingFrontierSnapshot = w.getFrontierPositionsArray();
        pendingFrontierReset = true;
        return;
      }
      case "BUILD_OUTPOST": {
        const w = world;
        if (!w) return;
        // Cost check?
        const cost = 1000; // Config later
        if (uiSnapshot.credits >= cost) {
          uiSnapshot.credits -= cost;
          w.addOutpost(cmd.x, cmd.y, cmd.z);
        }
        return;
      }
    }
  };

  const tickEngine = (_dtSeconds: number, _budgetMs: number, _maxSubsteps: number) => {
    tick += 1;
    drones = syncDroneCount(drones, uiSnapshot.droneCount, uiSnapshot.haulerCount, cfg);

    const dtSeconds = _dtSeconds;
    const moveSpeed = getDroneMoveSpeed(uiSnapshot.moveSpeedLevel, cfg);
    const mineDuration = getMineDuration(uiSnapshot.miningSpeedLevel, cfg);
    const minedPositions: number[] = [];
    const editsThisTick: VoxelEdit[] = [];
    const frontierAdded: number[] = [];
    const frontierRemoved: number[] = [];
    const debugChunksProcessed: string[] = [];
    const debugQueueLengthAtTickStart = playerChunksToScan.length;

    const w = world;
    if (w) {
      // Process player frontier expansion
      while (playerChunksToScan.length > 0) {
        const pc = playerChunksToScan.shift();
        if (pc) {
          const r = 2; // radius of chunks to auto-frontier
          forEachRadialChunk({ cx: pc.cx, cy: pc.cy, cz: pc.cz }, r, 2, (c) => {
            const added = w.ensureFrontierInChunk(c.cx, c.cz);
            debugChunksProcessed.push(`${c.cx},${c.cz}:${added ? added.length : "skip"}`);
            if (added && added.length > 0) {
              for (const pos of added) {
                addKey(frontier, voxelKey(pos.x, pos.y, pos.z));
                frontierAdded.push(pos.x, pos.y, pos.z);
              }
            }
          });
        }
      }

      tickDrones({
        world: w,
        drones,
        dtSeconds,
        cfg,
        frontier,
        minedKeys,
        reservedKeys,
        moveSpeed,
        mineDuration,
        maxTargetAttempts,
        uiSnapshot,
        minedPositions,
        editsThisTick,
        frontierAdded,
        frontierRemoved,
      });
    }

    const { entities, entityTargets, entityStates } = encodeDrones(drones);

    const delta: RenderDelta = {
      tick,
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
    };

    if (pendingFrontierSnapshot) {
      // Merge pendingFrontierSnapshot with any incremental frontierAdded (don't discard incremental updates!)
      if (frontierAdded.length > 0) {
        const merged = new Float32Array(pendingFrontierSnapshot.length + frontierAdded.length);
        merged.set(pendingFrontierSnapshot, 0);
        merged.set(new Float32Array(frontierAdded), pendingFrontierSnapshot.length);
        delta.frontierAdd = merged;
      } else {
        delta.frontierAdd = pendingFrontierSnapshot;
      }
      delta.frontierReset = pendingFrontierReset;
      pendingFrontierSnapshot = null;
      pendingFrontierReset = false;
    }

    return {
      delta,
      ui: uiSnapshot,
      backlog: 0,
    };
  };

  return {
    dispatch,
    tick: tickEngine,
  };
};
