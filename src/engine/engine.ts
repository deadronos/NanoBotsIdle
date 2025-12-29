import { getDroneMoveSpeed, getMineDuration } from "../config/drones";
import { getConfig } from "../config/index";
import { computeNextUpgradeCosts, tryBuyUpgrade, type UpgradeType } from "../economy/upgrades";
import type { Cmd, RenderDelta, UiSnapshot } from "../shared/protocol";
import { getVoxelValueFromHeight } from "../sim/terrain-core";
import { type Drone, syncDroneCount } from "./drones";
import { encodeDrones, toFloat32ArrayOrUndefined } from "./encode";
import {
  addKey as addKeyToIndex,
  createKeyIndex,
  removeKey as removeKeyFromIndex,
  resetKeyIndex,
} from "./keyIndex";
import { pickTargetKey } from "./targeting";
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

export const createEngine = (_seed?: number): Engine => {
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

  const uiSnapshot: UiSnapshot = {
    credits: 0,
    prestigeLevel: 1,
    droneCount: 3,
    miningSpeedLevel: 1,
    moveSpeedLevel: 1,
    laserPowerLevel: 1,
    minedBlocks: 0,
    totalBlocks: 0,
    upgrades: {},
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
    pendingFrontierSnapshot = result.frontierPositions;
    pendingFrontierReset = true;
  };

  ensureSeedWithMinAboveWater(uiSnapshot.prestigeLevel);

  const isUpgradeType = (id: string): id is UpgradeType =>
    id === "drone" || id === "speed" || id === "move" || id === "laser";

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
    }
  };

  const tickEngine = (
    _dtSeconds: number,
    _budgetMs: number,
    _maxSubsteps: number,
  ) => {
    tick += 1;
    drones = syncDroneCount(drones, uiSnapshot.droneCount, cfg);

    const dtSeconds = _dtSeconds;
    const moveSpeed = getDroneMoveSpeed(uiSnapshot.moveSpeedLevel, cfg);
    const mineDuration = getMineDuration(uiSnapshot.miningSpeedLevel, cfg);
    const minedPositions: number[] = [];
    const editsThisTick: { x: number; y: number; z: number; mat: number }[] = [];
    const frontierAdded: number[] = [];
    const frontierRemoved: number[] = [];

    if (world) {
      for (const drone of drones) {
        switch (drone.state) {
          case "SEEKING": {
            const targetKey = pickTargetKey({
              world,
              frontierKeys: frontier.keys,
              minedKeys,
              reservedKeys,
              waterLevel: cfg.terrain.waterLevel,
              maxAttempts: maxTargetAttempts,
            });
            if (targetKey) {
              const coords = world.coordsFromKey(targetKey);
              drone.targetKey = targetKey;
              drone.targetX = coords.x;
              drone.targetY = coords.y;
              drone.targetZ = coords.z;
              drone.state = "MOVING";
            }
            break;
          }
          case "MOVING": {
            if (!drone.targetKey) {
              drone.state = "SEEKING";
              break;
            }
            const destY = drone.targetY + 2;
            const dx = drone.targetX - drone.x;
            const dy = destY - drone.y;
            const dz = drone.targetZ - drone.z;
            const dist = Math.hypot(dx, dy, dz);

            if (dist < 0.5) {
              drone.state = "MINING";
              drone.miningTimer = 0;
            } else if (dist > 0) {
              const step = moveSpeed * dtSeconds;
              const inv = step / dist;
              drone.x += dx * inv;
              drone.y += dy * inv;
              drone.z += dz * inv;
            }
            break;
          }
          case "MINING": {
            drone.miningTimer += dtSeconds;
            if (drone.miningTimer >= mineDuration) {
              const key = drone.targetKey;
              if (key && !minedKeys.has(key)) {
                const editResult = world.mineVoxel(drone.targetX, drone.targetY, drone.targetZ);
                if (editResult) {
                  minedKeys.add(key);
                  reservedKeys.delete(key);
                  minedPositions.push(drone.targetX, drone.targetY, drone.targetZ);
                  editsThisTick.push(editResult.edit);
                  editResult.frontierAdded.forEach((pos) => {
                    const key = world!.key(pos.x, pos.y, pos.z);
                    addKeyToIndex(frontier, key);
                    frontierAdded.push(pos.x, pos.y, pos.z);
                  });
                  editResult.frontierRemoved.forEach((pos) => {
                    const key = world!.key(pos.x, pos.y, pos.z);
                    removeKeyFromIndex(frontier, key);
                    frontierRemoved.push(pos.x, pos.y, pos.z);
                  });

                  const value = getVoxelValueFromHeight(drone.targetY);
                  uiSnapshot.credits += value * uiSnapshot.prestigeLevel;
                  uiSnapshot.minedBlocks += 1;
                }
              }
              drone.state = "SEEKING";
              drone.targetKey = null;
              drone.miningTimer = 0;
            }
            break;
          }
        }
      }
      uiSnapshot.totalBlocks = world.countFrontierAboveWater();
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
    };

    if (pendingFrontierSnapshot) {
      delta.frontierAdd = pendingFrontierSnapshot;
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
