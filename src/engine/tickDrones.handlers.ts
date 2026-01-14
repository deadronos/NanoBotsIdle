import type { Config } from "../config/index";
import type { UiSnapshot, VoxelEdit } from "../shared/protocol";
import type { VoxelKey } from "../shared/voxel";
import { getVoxelValueFromHeight } from "../sim/terrain-core";
import type { Drone } from "./drones";
import { addKey, type KeyIndex, removeKey } from "./keyIndex";
import { moveTowards } from "./movement";
import { handleDeposit, handleDockRequest } from "./outpostHelpers";
import { pickTargetKey } from "./targeting";
import type { Outpost, WorldModel } from "./world/world";

export type TickDronesContext = {
  world: WorldModel;
  drones: Drone[];
  dtSeconds: number;
  cfg: Config;
  frontier: KeyIndex<VoxelKey>;
  minedKeys: Set<VoxelKey>;
  reservedKeys: Set<VoxelKey>;
  moveSpeed: number;
  mineDuration: number;
  maxTargetAttempts: number;
  uiSnapshot: UiSnapshot;
  minedPositions: number[];
  editsThisTick: VoxelEdit[];
  frontierAdded: number[];
  frontierRemoved: number[];
  depositEvents: { x: number; y: number; z: number; amount: number }[];
  pickOutpost: (x: number, y: number, z: number) => Outpost | null;
};

export const handleMinerState = (
  drone: Drone,
  context: TickDronesContext,
) => {
  const {
    world,
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
    depositEvents,
    pickOutpost,
  } = context;

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
      if (targetKey !== null) {
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
      if (drone.targetKey === null || typeof drone.targetKey !== "number") {
        drone.state = "SEEKING";
        break;
      }
      const destY = drone.targetY + 2;
      const dist = moveTowards(
        drone,
        drone.targetX,
        destY,
        drone.targetZ,
        moveSpeed,
        dtSeconds,
      );
      if (dist < 0.5) {
        drone.state = "MINING";
        drone.miningTimer = 0;
      }
      break;
    }
    case "MINING": {
      drone.miningTimer += dtSeconds;
      if (drone.miningTimer < mineDuration) break;

      const key = drone.targetKey;
      if (key !== null && typeof key === "number" && !minedKeys.has(key)) {
        const editResult = world.mineVoxel(
          drone.targetX,
          drone.targetY,
          drone.targetZ,
        );
        if (editResult) {
          minedKeys.add(key);
          reservedKeys.delete(key);
          minedPositions.push(drone.targetX, drone.targetY, drone.targetZ);
          editsThisTick.push(editResult.edit);

          editResult.frontierAdded.forEach((pos) => {
            const k = world.key(pos.x, pos.y, pos.z);
            addKey(frontier, k);
            frontierAdded.push(pos.x, pos.y, pos.z);
          });

          editResult.frontierRemoved.forEach((pos) => {
            const k = world.key(pos.x, pos.y, pos.z);
            removeKey(frontier, k);
            frontierRemoved.push(pos.x, pos.y, pos.z);
          });

          const value = getVoxelValueFromHeight(
            drone.targetY,
            cfg.terrain.waterLevel,
          );
          drone.payload += value * uiSnapshot.prestigeLevel;

          // Track mined block count for prestige unlocking.
          uiSnapshot.minedBlocks += 1;
        }
      }

      if (drone.payload >= drone.maxPayload) {
        drone.state = "RETURNING";
        drone.targetKey = null;
      } else {
        drone.state = "SEEKING";
        drone.targetKey = null;
      }
      drone.miningTimer = 0;
      break;
    }
    case "RETURNING": {
      // Hauler Intercept Check: If payload is gone, go back to seeking!
      if (drone.payload <= 0.1) {
        drone.state = "SEEKING";
        break;
      }

      const outpost = pickOutpost(drone.x, drone.y, drone.z);
      if (!outpost) break;

      const dist = moveTowards(
        drone,
        outpost.x,
        outpost.y + 2,
        outpost.z,
        moveSpeed,
        dtSeconds,
      );

      if (dist < 1.0) {
        handleDockRequest(world, drone, outpost);
      }
      break;
    }
    case "QUEUING": {
      const outpost = pickOutpost(drone.x, drone.y, drone.z);
      if (!outpost) {
        drone.state = "RETURNING";
        break;
      }

      const oldState = drone.state;
      handleDockRequest(world, drone, outpost);
      if (drone.state !== oldState) break;

      // Orbit behavior: Circle around center at y + 5
      const angle = Date.now() / 1000 + drone.id;
      const orbitRadius = 6;
      const targetX = outpost.x + Math.sin(angle) * orbitRadius;
      const targetZ = outpost.z + Math.cos(angle) * orbitRadius;
      const targetY = outpost.y + 5;

      moveTowards(drone, targetX, targetY, targetZ, moveSpeed, dtSeconds);
      break;
    }
    case "DEPOSITING": {
      handleDeposit(
        world,
        drone,
        depositEvents,
        uiSnapshot,
        dtSeconds,
        "SEEKING",
      );
      break;
    }
    default:
      if (drone.payload <= 0) drone.state = "SEEKING";
      break;
  }
};

export const handleHaulerState = (
  drone: Drone,
  context: TickDronesContext,
) => {
  const {
    world,
    drones,
    dtSeconds,
    cfg,
    uiSnapshot,
    depositEvents,
    pickOutpost,
  } = context;

  const hSpeed =
    cfg.drones.haulers.baseSpeed +
    (uiSnapshot.moveSpeedLevel - 1) * cfg.drones.haulers.speedPerLevel;

  switch (drone.state) {
    case "IDLE": {
      // Find target
      let bestTarget: Drone | null = null;
      let bestScore = -Infinity;

      for (const other of drones) {
        if (
          other.role === "MINER" &&
          other.payload > 0 &&
          other.state !== "DEPOSITING"
        ) {
          const dx = other.x - drone.x;
          const dy = other.y - drone.y;
          const dz = other.z - drone.z;
          const dist = Math.hypot(dx, dy, dz);
          // Score = payload / (dist + 50)
          let score = other.payload / (dist + 50);
          if (other.state === "RETURNING") score *= 1.5;

          if (score > bestScore) {
            bestScore = score;
            bestTarget = other;
          }
        }
      }

      if (bestTarget) {
        drone.targetKey = `miner-${bestTarget.id}`;
        drone.state = "FETCHING";
      } else if (drone.payload > 0) {
        drone.state = "RETURNING";
      }
      break;
    }
    case "FETCHING": {
      if (
        drone.targetKey === null ||
        typeof drone.targetKey !== "string" ||
        !drone.targetKey.startsWith("miner-")
      ) {
        drone.state = "IDLE";
        break;
      }
      const targetId = parseInt(drone.targetKey.split("-")[1], 10);
      const target = drones.find((d) => d.id === targetId);

      if (!target || target.payload <= 0 || target.state === "DEPOSITING") {
        drone.state = drone.payload > 0 ? "RETURNING" : "IDLE";
        drone.targetKey = null;
        break;
      }

      drone.targetX = target.x;
      drone.targetY = target.y + 1;
      drone.targetZ = target.z;

      const dist = moveTowards(
        drone,
        target.x,
        target.y + 2,
        target.z,
        hSpeed,
        dtSeconds,
      );

      if (dist < 3.0) {
        const space = drone.maxPayload - drone.payload;
        const take = Math.min(space, target.payload);

        drone.payload += take;
        target.payload -= take;

        if (drone.payload >= drone.maxPayload) {
          drone.state = "RETURNING";
          drone.targetKey = null;
        } else {
          drone.state = "IDLE";
          drone.targetKey = null;
        }
      }
      break;
    }
    case "RETURNING": {
      const outpost = pickOutpost(drone.x, drone.y, drone.z);
      if (!outpost) break;

      const dist = moveTowards(
        drone,
        outpost.x,
        outpost.y + 4,
        outpost.z,
        hSpeed,
        dtSeconds,
      );

      if (dist < 1.5) {
        handleDockRequest(world, drone, outpost);
      }
      break;
    }
    case "QUEUING": {
      // Hauler Queue logic (copy/paste similar to Miner for now)
      // Haulers might have VIP priority in future?
      const outpost = pickOutpost(drone.x, drone.y, drone.z);
      if (!outpost) {
        drone.state = "RETURNING";
        break;
      }

      const oldState = drone.state;
      handleDockRequest(world, drone, outpost);
      if (drone.state !== oldState) break;

      // Orbit
      const angle = Date.now() / 1000 + drone.id;
      moveTowards(
        drone,
        outpost.x + Math.sin(angle) * 8,
        outpost.y + 8,
        outpost.z + Math.cos(angle) * 8,
        hSpeed,
        dtSeconds,
      );
      break;
    }
    case "DEPOSITING": {
      handleDeposit(
        world,
        drone,
        depositEvents,
        uiSnapshot,
        dtSeconds,
        "IDLE",
      );
      break;
    }
    default:
      drone.state = "IDLE";
      break;
  }
};
