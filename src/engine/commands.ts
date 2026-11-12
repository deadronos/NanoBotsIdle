import {
  computeNextUpgradeCosts,
  getPrestigeRequirement,
  tryBuyUpgrade,
  type UpgradeType,
} from "../economy/upgrades";
import { inMiningZone } from "../shared/miningOperations";
import type { Cmd } from "../shared/protocol";
import { MATERIAL_AIR } from "../shared/voxel";
import { debug } from "../utils/logger";
import type { EngineContext } from "./context";
import { createKeyIndex, resetKeyIndex } from "./keyIndex";
import { initWorldForPrestige } from "./world/initWorld";

export const updateNextCosts = (ctx: EngineContext) => {
  ctx.uiSnapshot.nextCosts = computeNextUpgradeCosts(ctx.uiSnapshot, ctx.cfg);
};

export const resetTargets = (ctx: EngineContext) => {
  ctx.minedKeys.clear();
  ctx.reservedKeys.clear();
};

export const ensureSeedWithMinAboveWater = (ctx: EngineContext, prestigeLevel: number) => {
  const result = initWorldForPrestige(prestigeLevel, ctx.cfg, ctx.uiSnapshot.landingProfile);
  ctx.world = result.world;
  resetKeyIndex(ctx.frontier, result.frontierKeys);
  ctx.uiSnapshot.totalBlocks = result.aboveWaterCount;
  ctx.uiSnapshot.actualSeed = result.actualSeed;
  ctx.uiSnapshot.landingSpawn = result.world.landingSpawn;
  ctx.pendingFrontierSnapshot = result.frontierPositions;
  ctx.pendingFrontierReset = true;
  return result.world;
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
    case "SET_MINING_ZONE":
    case "CLEAR_MINING_ZONE": {
      const world = ctx.world;
      if (!world) return;
      const zone = cmd.t === "SET_MINING_ZONE" ? cmd.zone : undefined;
      ctx.uiSnapshot.miningZone = zone;
      ctx.zoneFrontier = undefined;
      if (zone) {
        const index = createKeyIndex<number>();
        resetKeyIndex(
          index,
          ctx.frontier.keys.filter((key) => {
            const { x, y, z } = world.coordsFromKey(key);
            return (
              inMiningZone(zone, x, z) &&
              y >= Math.floor(ctx.cfg.terrain.waterLevel) &&
              !world.isStarterFoundation(x, z)
            );
          }),
        );
        ctx.zoneFrontier = index;
        const size = ctx.cfg.terrain.chunkSize ?? 16;
        ctx.playerChunksToScan.push({
          cx: Math.floor(zone.x / size),
          cy: 0,
          cz: Math.floor(zone.z / size),
        });
      }
      for (const drone of ctx.drones) {
        if (drone.role !== "MINER" || (drone.state !== "MOVING" && drone.state !== "MINING"))
          continue;
        if (zone && inMiningZone(zone, drone.targetX, drone.targetZ)) continue;
        if (typeof drone.targetKey === "number") ctx.reservedKeys.delete(drone.targetKey);
        drone.targetKey = null;
        drone.state = drone.payload > 0 ? "RETURNING" : "SEEKING";
      }
      return;
    }
    case "PRESTIGE": {
      const requirement = getPrestigeRequirement(ctx.uiSnapshot.prestigeLevel, ctx.cfg);
      if (ctx.uiSnapshot.minedBlocks < requirement) return;
      ctx.uiSnapshot.credits = 0;
      ctx.uiSnapshot.minedBlocks = 0;
      ctx.uiSnapshot.totalBlocks = 0;
      ctx.uiSnapshot.prestigeLevel += 1;
      ctx.uiSnapshot.landingProfile = cmd.landing;
      ctx.uiSnapshot.miningZone = undefined;
      ctx.zoneFrontier = undefined;
      resetTargets(ctx);
      ctx.drones = [];
      ctx.playerChunksToScan.length = 0;
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
      const { x, y, z } = cmd;
      if (![x, y, z].every(Number.isInteger) || Math.abs(x) > 500 || Math.abs(z) > 500) return;
      if (
        y <= ctx.cfg.terrain.waterLevel ||
        w.materialAt(x, y - 1, z) === MATERIAL_AIR ||
        w.materialAt(x, y, z) !== MATERIAL_AIR ||
        w.getOutposts().some((op) => Math.hypot(op.x - x, op.z - z) < 4)
      )
        return;
      const cost = ctx.cfg.economy.baseCosts.outpost;
      if (ctx.uiSnapshot.credits >= cost) {
        ctx.uiSnapshot.credits -= cost;
        w.addOutpost(cmd.x, cmd.y, cmd.z);
      }
      return;
    }
  }
};
