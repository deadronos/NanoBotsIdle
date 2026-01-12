import type { Config } from "../config/index";
import type { UiSnapshot, VoxelEdit } from "../shared/protocol";
import { getVoxelValueFromHeight } from "../sim/terrain-core";
import type { Drone, DroneState } from "./drones";
import { addKey, type KeyIndex, removeKey } from "./keyIndex";
import { pickTargetKey } from "./targeting";
import type { WorldModel } from "./world/world";

// Helper to avoid duplicate movement code
const moveTowards = (
  drone: Drone,
  tx: number,
  ty: number,
  tz: number,
  speed: number,
  dt: number,
) => {
  const dx = tx - drone.x;
  const dy = ty - drone.y;
  const dz = tz - drone.z;
  const dist = Math.hypot(dx, dy, dz);

  if (dist > 0) {
    const step = Math.min(dist, speed * dt);
    const inv = step / dist;
    drone.x += dx * inv;
    drone.y += dy * inv;
    drone.z += dz * inv;
  }
  return dist;
};

// --- Helper Functions ---

const handleDockingRequest = (
  drone: Drone,
  world: WorldModel,
  outpost: { x: number; y: number; z: number },
) => {
  const result = world.requestDock(outpost, drone.id);
  if (result === "GRANTED") {
    drone.state = "DEPOSITING";
    drone.miningTimer = 0;
    return true;
  }
  return false;
};

const checkReroute = (
  drone: Drone,
  world: WorldModel,
  outpost: { x: number; y: number; z: number },
) => {
  const QUEUE_THRESHOLD = 5;
  const REROUTE_COOLDOWN_MS = 5000;
  const now = Date.now();
  if (
    world.getQueueLength(outpost) > QUEUE_THRESHOLD &&
    (drone.lastRerouteAt ?? 0) + REROUTE_COOLDOWN_MS < now
  ) {
    drone.lastRerouteAt = now;
    drone.state = "RETURNING";
    return true;
  }
  return false;
};

const orbitOutpost = (
  drone: Drone,
  outpost: { x: number; y: number; z: number },
  radius: number,
  heightOffset: number,
  speed: number,
  dtSeconds: number,
) => {
  const angle = Date.now() / 1000 + drone.id;
  const targetX = outpost.x + Math.sin(angle) * radius;
  const targetZ = outpost.z + Math.cos(angle) * radius;
  const targetY = outpost.y + heightOffset;

  moveTowards(drone, targetX, targetY, targetZ, speed, dtSeconds);
};

const handleDepositing = (
  drone: Drone,
  dtSeconds: number,
  world: WorldModel,
  uiSnapshot: UiSnapshot,
  depositEvents: { x: number; y: number; z: number; amount: number }[],
  nextState: DroneState,
) => {
  drone.miningTimer += dtSeconds;
  if (drone.miningTimer >= 0.5) {
    uiSnapshot.credits += drone.payload;
    const outpost = world.getNearestOutpost(drone.x, drone.y, drone.z);
    if (outpost) {
      depositEvents.push({
        x: outpost.x,
        y: outpost.y,
        z: outpost.z,
        amount: Math.floor(drone.payload),
      });
      world.undock(outpost, drone.id);
    }
    drone.payload = 0;
    drone.state = nextState;
    drone.miningTimer = 0;
  }
};

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
  depositEvents: { x: number; y: number; z: number; amount: number }[];
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
    depositEvents,
  } = options;

  // Choose outpost using getBestOutpost if available; fall back to getNearestOutpost for test stubs
  type Outpost = { x: number; y: number; z: number };
  const worldWithOptional = world as unknown as {
    getBestOutpost?: (x: number, y: number, z: number) => Outpost | null;
    getNearestOutpost: (x: number, y: number, z: number) => Outpost | null;
  };
  const pickOutpost = (
    worldWithOptional.getBestOutpost ?? worldWithOptional.getNearestOutpost
  ).bind(worldWithOptional);

  for (const drone of drones) {
    if (drone.role === "MINER") {
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
          if (key && !minedKeys.has(key)) {
            const editResult = world.mineVoxel(drone.targetX, drone.targetY, drone.targetZ);
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

              const value = getVoxelValueFromHeight(drone.targetY, cfg.terrain.waterLevel);
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
            if (!handleDockingRequest(drone, world, outpost)) {
              if (checkReroute(drone, world, outpost)) {
                // Reroute check passed, state already set to RETURNING
              } else {
                drone.state = "QUEUING";
              }
            }
          }
          break;
        }
        case "QUEUING": {
          const outpost = pickOutpost(drone.x, drone.y, drone.z);
          if (!outpost) {
            drone.state = "RETURNING";
            break;
          }

          if (handleDockingRequest(drone, world, outpost)) break;

          if (checkReroute(drone, world, outpost)) break;

          orbitOutpost(drone, outpost, 6, 5, moveSpeed, dtSeconds);
          break;
        }
        case "DEPOSITING": {
          handleDepositing(drone, dtSeconds, world, uiSnapshot, depositEvents, "SEEKING");
          break;
        }
        default:
          if (drone.payload <= 0) drone.state = "SEEKING";
          break;
      }
    } else if (drone.role === "HAULER") {
      const hSpeed =
        cfg.drones.haulers.baseSpeed +
        (uiSnapshot.moveSpeedLevel - 1) * cfg.drones.haulers.speedPerLevel;

      switch (drone.state) {
        case "IDLE": {
          // Find target
          let bestTarget: Drone | null = null;
          let bestScore = -Infinity;

          for (const other of drones) {
            if (other.role === "MINER" && other.payload > 0 && other.state !== "DEPOSITING") {
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
          if (!drone.targetKey || !drone.targetKey.startsWith("miner-")) {
            drone.state = "IDLE";
            break;
          }
          const targetId = parseInt(drone.targetKey.split("-")[1]);
          const target = drones.find((d) => d.id === targetId);

          if (!target || target.payload <= 0 || target.state === "DEPOSITING") {
            drone.state = drone.payload > 0 ? "RETURNING" : "IDLE";
            drone.targetKey = null;
            break;
          }

          drone.targetX = target.x;
          drone.targetY = target.y + 1;
          drone.targetZ = target.z;

          const dist = moveTowards(drone, target.x, target.y + 2, target.z, hSpeed, dtSeconds);

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

          const dist = moveTowards(drone, outpost.x, outpost.y + 4, outpost.z, hSpeed, dtSeconds);

          if (dist < 1.5) {
            if (!handleDockingRequest(drone, world, outpost)) {
              if (checkReroute(drone, world, outpost)) {
                // Reroute check passed, state already set to RETURNING
              } else {
                drone.state = "QUEUING";
              }
            }
          }
          break;
        }
        case "QUEUING": {
          // Hauler Queue logic
          const outpost = world.getBestOutpost(drone.x, drone.y, drone.z);
          if (!outpost) {
            drone.state = "RETURNING";
            break;
          }
          if (handleDockingRequest(drone, world, outpost)) break;

          if (checkReroute(drone, world, outpost)) break;

          orbitOutpost(drone, outpost, 8, 8, hSpeed, dtSeconds);
          break;
        }
        case "DEPOSITING": {
          handleDepositing(drone, dtSeconds, world, uiSnapshot, depositEvents, "IDLE");
          break;
        }
        default:
          drone.state = "IDLE";
          break;
      }
    }
  }

  uiSnapshot.totalBlocks = world.countFrontierAboveWater();
};
