import { describe, expect, it } from "vitest";
import { createWorld, allocateEntityId } from "../world/createWorld";
import { droneAssignmentSystem } from "./droneAssignmentSystem";
import movementSystem from "./movementSystem";
import { pathfindingSystem } from "./pathfindingSystem";
import type { TaskRequest } from "../../types/entities";

const runSystems = (world: ReturnType<typeof createWorld>): void => {
  droneAssignmentSystem.update(world, 1);
  pathfindingSystem.update(world, 1);
  movementSystem.update(world, 1);
};

describe("drone hauling integration", () => {
  it("assigns a hauler drone to move resources from source to destination", () => {
    const world = createWorld({ spawnEntities: false });
    world.grid = {
      width: 5,
      height: 1,
      isWalkable: (x, y) => x >= 0 && x < 5 && y === 0,
      getTraversalCost: () => 0,
    };

    const droneId = allocateEntityId(world);
    world.position[droneId] = { x: 0, y: 0 };
    world.inventory[droneId] = { capacity: 5, contents: {} };
    world.droneBrain[droneId] = {
      role: "hauler",
      state: "idle",
      currentTaskId: undefined,
      pendingPathId: undefined,
      moveProgress: 0,
      speed: 1,
    };

    const sourceId = allocateEntityId(world);
    world.position[sourceId] = { x: 2, y: 0 };
    world.inventory[sourceId] = { capacity: 20, contents: { Iron: 5 } };

    const destinationId = allocateEntityId(world);
    world.position[destinationId] = { x: 4, y: 0 };
    world.inventory[destinationId] = { capacity: 20, contents: {} };

    const task: TaskRequest = {
      id: "task-1",
      type: "haul",
      payload: {
        resource: "Iron",
        amount: 4,
        remaining: 4,
        sourceId,
        destinationId,
      },
      status: "pending",
    };

    world.taskRequests.push(task);

    for (let i = 0; i < 12; i += 1) {
      runSystems(world);
    }

    expect(world.inventory[sourceId].contents.Iron).toBe(1);
    expect(world.inventory[destinationId].contents.Iron).toBe(4);
    expect(world.inventory[droneId].contents.Iron ?? 0).toBe(0);
    expect(world.droneBrain[droneId].state).toBe("idle");
    expect(task.status).toBe("completed");
    expect(world.path[droneId]).toBeUndefined();
  });
});
