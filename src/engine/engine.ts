/* eslint-disable simple-import-sort/imports */
import { getConfig } from "../config/index";
import { computeNextUpgradeCosts } from "../economy/upgrades";
import type { Cmd, RenderDelta, UiSnapshot } from "../shared/protocol";
import type { VoxelKey } from "../shared/voxel";
import { createKeyIndex } from "./keyIndex";
import { handleCommand, ensureSeedWithMinAboveWater } from "./commands";
import { tickEngine } from "./tick";
import type { EngineContext } from "./context";
import { STARTER_OUTPOST_ID } from "./world/landingSite";

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
    elapsedSeconds: 0,
    cfg,
    minedKeys: new Set<VoxelKey>(),
    reservedKeys: new Set<VoxelKey>(),
    world: null,
    frontier: createKeyIndex<VoxelKey>(),
    pendingFrontierSnapshot: null,
    pendingFrontierReset: false,
    drones: [],
    playerChunksToScan: [],
    depositIncome: { prestigeLevel: saveState?.prestigeLevel ?? 1, samples: [], total: 0 },
    uiSnapshot: {
      credits: saveState?.credits ?? 0,
      creditsPerMinute: 0,
      cargoInTransit: 0,
      prestigeLevel: saveState?.prestigeLevel ?? 1,
      landingProfile: saveState?.landingProfile,
      droneCount: saveState?.droneCount ?? 3,
      haulerCount: saveState?.haulerCount ?? 0,
      miningSpeedLevel: saveState?.miningSpeedLevel ?? 1,
      moveSpeedLevel: saveState?.moveSpeedLevel ?? 1,
      laserPowerLevel: saveState?.laserPowerLevel ?? 1,
      minedBlocks: saveState?.minedBlocks ?? 0,
      totalBlocks: 0,
      outposts: [],
      nextCosts: undefined,
    },
  };

  // Initialize costs
  ctx.uiSnapshot.nextCosts = computeNextUpgradeCosts(ctx.uiSnapshot, cfg);

  // Initialize world
  const world = ensureSeedWithMinAboveWater(ctx, ctx.uiSnapshot.prestigeLevel);

  // The generated starter was first in legacy saves and used fixed coordinates.
  // Recreate it from the seed while retaining player-built outpost IDs and levels.
  saveState?.outposts?.forEach((outpost, index) => {
    const isLegacyStarter = index === 0 && outpost.x === 0 && outpost.y === 10 && outpost.z === 0;
    if (outpost.id === STARTER_OUTPOST_ID || isLegacyStarter) return;
    if (
      world
        .getOutposts()
        .some(({ x, y, z }) => x === outpost.x && y === outpost.y && z === outpost.z)
    )
      return;
    world.addOutpost(outpost.x, outpost.y, outpost.z, outpost);
  });

  const dispatch = (cmd: Cmd) => handleCommand(ctx, cmd);

  const tick = (dtSeconds: number, budgetMs: number, maxSubsteps: number) =>
    tickEngine(ctx, dtSeconds, budgetMs, maxSubsteps);

  return {
    dispatch,
    tick,
  };
};
