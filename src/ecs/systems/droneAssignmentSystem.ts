import type { DroneBrain } from "../components/DroneBrain";
import type { TaskRequest } from "../../types/entities";
import { ensurePathRequest, clearPathForEntity } from "../pathfinding/pathRequests";
import type { System } from "./System";
import type { EntityId } from "../world/EntityId";
import type { World } from "../world/World";

const isHaulerDrone = (drone: DroneBrain): boolean => drone.role === "hauler";

const getPosition = (world: World, entityId: EntityId) =>
  world.position[entityId];

const ensureRemainingField = (task: TaskRequest): void => {
  if (typeof task.payload.remaining !== "number") {
    task.payload.remaining = task.payload.amount;
  }
  task.payload.remaining = Math.max(task.payload.remaining, 0);
};

const assignTaskToDrone = (
  world: World,
  task: TaskRequest,
  droneId: EntityId,
  drone: DroneBrain,
): void => {
  ensureRemainingField(task);
  const dronePosition = getPosition(world, droneId);
  const sourcePosition = getPosition(world, task.payload.sourceId);

  if (!dronePosition || !sourcePosition) {
    return;
  }

  clearPathForEntity(world, droneId);

  task.status = "assigned";
  task.assignedTo = droneId;
  drone.currentTaskId = task.id;
  drone.state = "toPickup";
  drone.moveProgress = 0;
  drone.pendingPathId = ensurePathRequest(
    world,
    droneId,
    dronePosition,
    sourcePosition,
    "pickup",
  );
};

export const droneAssignmentSystem: System = {
  id: "droneAssignment",
  update: (world) => {
    const idleDroneEntries = Object.entries(world.droneBrain)
      .map(([id, drone]) => [Number(id) as EntityId, drone] as const)
      .filter(
        ([, drone]) => isHaulerDrone(drone) && drone.state === "idle",
      );

    if (idleDroneEntries.length === 0) {
      return;
    }

    for (const task of world.taskRequests) {
      if (task.status !== "pending") {
        continue;
      }

      const nextDroneEntry = idleDroneEntries.shift();
      if (!nextDroneEntry) {
        break;
      }

      const [droneId, drone] = nextDroneEntry;
      assignTaskToDrone(world, task, droneId, drone);
      if (task.status !== "assigned") {
        idleDroneEntries.unshift([droneId, drone]);
      }
    }
  },
};

export default droneAssignmentSystem;
