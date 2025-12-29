import type { Config } from "../config/index";
import type { UiSnapshot, VoxelEdit } from "../shared/protocol";
import { getVoxelValueFromHeight } from "../sim/terrain-core";
import type { Drone } from "./drones";
import { addKey, type KeyIndex, removeKey } from "./keyIndex";
import { pickTargetKey } from "./targeting";
import type { WorldModel } from "./world/world";

export const tickDrones = (options: {
  world: WorldModel;
  drones: Drone[];
  dtSeconds: number;
  cfg: Config;
  frontier: KeyIndex;
  minedKeys: Set<string>;
  reservedKeys: Set<string>;
  moveSpeed: number;
  mineDuration: number;
  maxTargetAttempts: number;
  uiSnapshot: UiSnapshot;
  minedPositions: number[];
  editsThisTick: VoxelEdit[];
  frontierAdded: number[];
  frontierRemoved: number[];
}) => {
  const {
    world,
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
  } = options;

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
        if (drone.miningTimer < mineDuration) break;

        const key = drone.targetKey;
        if (key && !minedKeys.has(key)) {
          const editResult = world.mineVoxel(drone.targetX, drone.targetY, drone.targetZ);
          if (editResult) {
            minedKeys.add(key);
            reservedKeys.delete(key);
            minedPositions.push(drone.targetX, drone.targetY, drone.targetZ);
            editsThisTick.push(editResult.edit);

            editResult.frontierAdded.forEach((pos) => {
              const key = world.key(pos.x, pos.y, pos.z);
              addKey(frontier, key);
              frontierAdded.push(pos.x, pos.y, pos.z);
            });

            editResult.frontierRemoved.forEach((pos) => {
              const key = world.key(pos.x, pos.y, pos.z);
              removeKey(frontier, key);
              frontierRemoved.push(pos.x, pos.y, pos.z);
            });

            const value = getVoxelValueFromHeight(drone.targetY, cfg.terrain.waterLevel);
            uiSnapshot.credits += value * uiSnapshot.prestigeLevel;
            uiSnapshot.minedBlocks += 1;
          }
        }

        drone.state = "SEEKING";
        drone.targetKey = null;
        drone.miningTimer = 0;
        break;
      }
    }
  }

  uiSnapshot.totalBlocks = world.countFrontierAboveWater();
};

