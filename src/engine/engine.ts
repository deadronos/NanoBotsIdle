/* eslint-disable simple-import-sort/imports */
import { getConfig } from "../config/index";
import { computeNextUpgradeCosts } from "../economy/upgrades";
import type { Cmd, RenderDelta, UiSnapshot } from "../shared/protocol";
import { createKeyIndex } from "./keyIndex";
import { handleCommand, ensureSeedWithMinAboveWater } from "./commands";
import { tickEngine } from "./tick";
import type { EngineContext } from "./context";

export type Engine = {
  dispatch: (cmd: Cmd) => void;
  tick: (
    dtSeconds: number,
    budgetMs: number,
    maxSubsteps: number,
  ) => { delta: RenderDelta; ui: UiSnapshot; backlog: number };
};

export const createEngine = (_seed?: number, saveState?: Partial<UiSnapshot>): Engine => {
  const cfg = getConfig();

  const ctx: EngineContext = {
    tick: 0,
    cfg,
    minedKeys: new Set<string>(),
    reservedKeys: new Set<string>(),
    world: null,
    frontier: createKeyIndex(),
    pendingFrontierSnapshot: null,
    pendingFrontierReset: false,
    drones: [],
    playerChunksToScan: [],
    uiSnapshot: {
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
      nextCosts: undefined,
    }
  };

  // Initialize costs
  ctx.uiSnapshot.nextCosts = computeNextUpgradeCosts(ctx.uiSnapshot, cfg);

  // Initialize world
  ensureSeedWithMinAboveWater(ctx, ctx.uiSnapshot.prestigeLevel);

  // Hydrate outposts
  if (saveState?.outposts) {
    saveState.outposts.forEach((op) => {
      // Check for duplicates if needed, or just add.
      // We check if an outpost with same coords exists.
      if (ctx.world && !ctx.world.getOutposts().find((e) => e.x === op.x && e.y === op.y && e.z === op.z)) {
        ctx.world.addOutpost(op.x, op.y, op.z);
      }
    });
  }

  const dispatch = (cmd: Cmd) => handleCommand(ctx, cmd);

  const tick = (dtSeconds: number, budgetMs: number, maxSubsteps: number) =>
    tickEngine(ctx, dtSeconds, budgetMs, maxSubsteps);

  return {
    dispatch,
    tick,
  };
};
