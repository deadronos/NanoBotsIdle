import { computeNextUpgradeCosts, tryBuyUpgrade, type UpgradeType } from "../economy/upgrades";
import type { Cmd } from "../shared/protocol";
import { debug } from "../utils/logger";
import type { EngineContext } from "./context";
import { resetKeyIndex } from "./keyIndex";
import { initWorldForPrestige } from "./world/initWorld";

export const updateNextCosts = (ctx: EngineContext) => {
  ctx.uiSnapshot.nextCosts = computeNextUpgradeCosts(ctx.uiSnapshot, ctx.cfg);
};

export const resetTargets = (ctx: EngineContext) => {
  ctx.minedKeys.clear();
  ctx.reservedKeys.clear();
};

export const ensureSeedWithMinAboveWater = (ctx: EngineContext, prestigeLevel: number) => {
  const result = initWorldForPrestige(prestigeLevel, ctx.cfg);
  ctx.world = result.world;
  resetKeyIndex(ctx.frontier, result.frontierKeys);
  ctx.uiSnapshot.totalBlocks = result.aboveWaterCount;
  ctx.uiSnapshot.actualSeed = result.actualSeed;
  ctx.pendingFrontierSnapshot = result.frontierPositions;
  ctx.pendingFrontierReset = true;
};

const isUpgradeType = (id: string): id is UpgradeType =>
  id === "drone" || id === "hauler" || id === "speed" || id === "move" || id === "laser";

export const handleCommand = (ctx: EngineContext, cmd: Cmd) => {
  switch (cmd.t) {
    case "BUY_UPGRADE": {
      if (!isUpgradeType(cmd.id)) return;
      const count = Math.max(1, cmd.n);
      for (let i = 0; i < count; i += 1) {
        tryBuyUpgrade(cmd.id, ctx.uiSnapshot, ctx.cfg);
      }
      updateNextCosts(ctx);
      return;
    }
    case "PRESTIGE": {
      if (ctx.uiSnapshot.minedBlocks < ctx.cfg.economy.prestigeMinMinedBlocks) return;
      ctx.uiSnapshot.credits = 0;
      ctx.uiSnapshot.minedBlocks = 0;
      ctx.uiSnapshot.totalBlocks = 0;
      ctx.uiSnapshot.prestigeLevel += 1;
      resetTargets(ctx);
      ensureSeedWithMinAboveWater(ctx, ctx.uiSnapshot.prestigeLevel);
      return;
    }
    case "SET_PLAYER_CHUNK": {
      // Debug-only logging to avoid noisy output in production/CI
      if (process.env.NODE_ENV === "development") {
        debug(
          `[engine] SET_PLAYER_CHUNK cx=${cmd.cx} cy=${cmd.cy} cz=${cmd.cz}, queue size before: ${ctx.playerChunksToScan.length}`,
        );
      }
      ctx.playerChunksToScan.push({ cx: cmd.cx, cy: cmd.cy, cz: cmd.cz });
      return;
    }
    case "REQUEST_FRONTIER_SNAPSHOT": {
      const w = ctx.world;
      if (!w) return;
      ctx.pendingFrontierSnapshot = w.getFrontierPositionsArray();
      ctx.pendingFrontierReset = true;
      return;
    }
    case "BUILD_OUTPOST": {
      const w = ctx.world;
      if (!w) return;
      // Cost check?
      const cost = 1000; // Config later
      if (ctx.uiSnapshot.credits >= cost) {
        ctx.uiSnapshot.credits -= cost;
        w.addOutpost(cmd.x, cmd.y, cmd.z);
      }
      return;
    }
  }
};
