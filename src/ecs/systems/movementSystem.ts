import type { Inventory } from "../components/Inventory";
import type { DroneBrain } from "../components/DroneBrain";
import type { TaskRequest } from "../../types/entities";
import {
  addResourceAmount,
  getResourceAmount,
  removeResourceAmount,
  sumQuantityMap,
} from "../utils/resources";
import type { EntityId } from "../world/EntityId";
import { ensurePathRequest, clearPathForEntity } from "../pathfinding/pathRequests";
import type { System } from "./System";
import type { World } from "../world/World";

const EPSILON = 1e-6;

const getTaskById = (world: World, taskId?: string): TaskRequest | undefined =>
  taskId ? world.taskRequests.find((task) => task.id === taskId) : undefined;

const getPosition = (world: World, entityId: EntityId) =>
  world.position[entityId];

const getInventory = (world: World, entityId: EntityId): Inventory | undefined =>
  world.inventory[entityId];

const ensurePathForState = (
  world: World,
  droneId: EntityId,
  drone: DroneBrain,
  task: TaskRequest,
): void => {
  const dronePosition = getPosition(world, droneId);
  if (!dronePosition) {
    return;
  }

  const targetEntityId =
    drone.state === "toPickup"
      ? task.payload.sourceId
      : task.payload.destinationId;
  const targetPosition = getPosition(world, targetEntityId);

  if (!targetPosition) {
    return;
  }

  const tag = drone.state === "toPickup" ? "pickup" : "dropoff";
  drone.pendingPathId = ensurePathRequest(
    world,
    droneId,
    dronePosition,
    targetPosition,
    tag,
  );
};

const handlePickup = (
  world: World,
  droneId: EntityId,
  drone: DroneBrain,
  task: TaskRequest,
): void => {
  const sourceInventory = getInventory(world, task.payload.sourceId);
  const droneInventory = getInventory(world, droneId);

  if (!sourceInventory || !droneInventory) {
    return;
  }

  const resource = task.payload.resource;
  const availableAtSource = getResourceAmount(
    sourceInventory.contents,
    resource,
  );
  const currentDroneLoad = sumQuantityMap(droneInventory.contents);
  const capacityRemaining = Math.max(
    droneInventory.capacity - currentDroneLoad,
    0,
  );

  if (capacityRemaining <= 0 || availableAtSource <= 0) {
    return;
  }

  const amountNeeded = task.payload.remaining ?? task.payload.amount;
  const transferAmount = Math.min(
    amountNeeded,
    availableAtSource,
    capacityRemaining,
  );

  if (transferAmount <= 0) {
    return;
  }

  const removed = removeResourceAmount(
    sourceInventory.contents,
    resource,
    transferAmount,
  );

  if (removed <= 0) {
    return;
  }

  addResourceAmount(droneInventory.contents, resource, removed);
  task.payload.remaining = Math.max(
    (task.payload.remaining ?? task.payload.amount) - removed,
    0,
  );

  drone.state = "toDropoff";
  drone.moveProgress = 0;
  clearPathForEntity(world, droneId);
  ensurePathForState(world, droneId, drone, task);
};

const handleDropoff = (
  world: World,
  droneId: EntityId,
  drone: DroneBrain,
  task: TaskRequest,
): void => {
  const droneInventory = getInventory(world, droneId);
  const destinationInventory = getInventory(world, task.payload.destinationId);

  if (!droneInventory || !destinationInventory) {
    return;
  }

  const resource = task.payload.resource;
  const carriedAmount = getResourceAmount(droneInventory.contents, resource);

  if (carriedAmount > 0) {
    removeResourceAmount(droneInventory.contents, resource, carriedAmount);
    addResourceAmount(destinationInventory.contents, resource, carriedAmount);
  }

  if ((task.payload.remaining ?? 0) <= EPSILON) {
    task.status = "completed";
    task.assignedTo = undefined;
    drone.currentTaskId = undefined;
    drone.state = "idle";
    drone.pendingPathId = undefined;
    drone.moveProgress = 0;
    clearPathForEntity(world, droneId);
    return;
  }

  drone.state = "toPickup";
  drone.moveProgress = 0;
  clearPathForEntity(world, droneId);
  ensurePathForState(world, droneId, drone, task);
};

const handleArrival = (
  world: World,
  droneId: EntityId,
  drone: DroneBrain,
  task: TaskRequest,
): void => {
  if (drone.state === "toPickup") {
    handlePickup(world, droneId, drone, task);
  } else if (drone.state === "toDropoff") {
    handleDropoff(world, droneId, drone, task);
  }
};

const advanceAlongPath = (
  world: World,
  droneId: EntityId,
  drone: DroneBrain,
  dt: number,
): void => {
  const path = world.path[droneId];
  if (!path) {
    return;
  }

  const nodes = path.nodes;
  if (nodes.length === 0) {
    clearPathForEntity(world, droneId);
    return;
  }

  const position = getPosition(world, droneId);
  if (!position) {
    return;
  }

  if (nodes.length === 1) {
    position.x = nodes[0].x;
    position.y = nodes[0].y;
    clearPathForEntity(world, droneId);
    return;
  }

  let currentIndex = Math.floor(path.progress);
  const currentNode = nodes[currentIndex];
  position.x = currentNode.x;
  position.y = currentNode.y;
  drone.moveProgress += drone.speed * dt;

  while (
    drone.moveProgress >= 1 - EPSILON &&
    currentIndex < nodes.length - 1
  ) {
    drone.moveProgress -= 1;
    currentIndex += 1;
    const node = nodes[currentIndex];
    position.x = node.x;
    position.y = node.y;
    path.progress = currentIndex;
  }

  if (currentIndex >= nodes.length - 1) {
    clearPathForEntity(world, droneId);
    drone.moveProgress = 0;
    const task = getTaskById(world, drone.currentTaskId);
    if (task) {
      handleArrival(world, droneId, drone, task);
    } else {
      drone.state = "idle";
      drone.currentTaskId = undefined;
    }
  }
};

export const movementSystem: System = {
  id: "movement",
  update: (world, dt) => {
    for (const [entityIdStr, drone] of Object.entries(world.droneBrain)) {
      const droneId = Number(entityIdStr) as EntityId;

      if (drone.state === "idle") {
        continue;
      }

      if (!Number.isFinite(drone.speed) || drone.speed <= 0) {
        drone.speed = 1;
      }

      if (!Number.isFinite(drone.moveProgress) || drone.moveProgress < 0) {
        drone.moveProgress = 0;
      }

      const task = getTaskById(world, drone.currentTaskId);
      if (!task) {
        drone.state = "idle";
        drone.currentTaskId = undefined;
        clearPathForEntity(world, droneId);
        continue;
      }

      if (!world.path[droneId]) {
        ensurePathForState(world, droneId, drone, task);
        continue;
      }

      advanceAlongPath(world, droneId, drone, dt);
    }
  },
};

export default movementSystem;
