import type { Position } from "../components/Position";
import type { EntityId } from "../world/EntityId";
import type { World } from "../world/World";

let pathRequestCounter = 0;

const clonePosition = (position: Position): Position => ({
  x: position.x,
  y: position.y,
});

export const positionsEqual = (a: Position, b: Position): boolean =>
  a.x === b.x && a.y === b.y;

const hasPendingRequestForGoal = (
  world: World,
  entityId: EntityId,
  goal: Position,
): boolean =>
  world.pathRequests.some(
    (request) =>
      request.entityId === entityId &&
      request.status === "pending" &&
      positionsEqual(request.goal, goal),
  );

const isPathTargetingGoal = (
  world: World,
  entityId: EntityId,
  goal: Position,
): boolean => {
  const path = world.path[entityId];
  if (!path || path.nodes.length === 0) {
    return false;
  }

  const lastNode = path.nodes[path.nodes.length - 1];
  return positionsEqual(lastNode, goal);
};

export const ensurePathRequest = (
  world: World,
  entityId: EntityId,
  start: Position,
  goal: Position,
  tag?: string,
): string | undefined => {
  if (isPathTargetingGoal(world, entityId, goal)) {
    return undefined;
  }

  if (hasPendingRequestForGoal(world, entityId, goal)) {
    return undefined;
  }

  const id = `path-${entityId}-${tag ?? "req"}-${pathRequestCounter}`;
  pathRequestCounter += 1;

  world.pathRequests.push({
    id,
    entityId,
    start: clonePosition(start),
    goal: clonePosition(goal),
    status: "pending",
  });

  return id;
};

export const clearPathForEntity = (world: World, entityId: EntityId): void => {
  delete world.path[entityId];
};
