import type { System } from "./System";
import { findPath } from "../pathfinding/astar";
import { clearPathForEntity } from "../pathfinding/pathRequests";
import type { PathRequest } from "../../types/entities";

const finalizeRequest = (
  request: PathRequest,
  status: PathRequest["status"],
): PathRequest => ({
  ...request,
  status,
});

const processRequest = (
  world: Parameters<System["update"]>[0],
  request: PathRequest,
): PathRequest => {
  if (request.status !== "pending") {
    return request;
  }

  const pathNodes = findPath(world.grid, request.start, request.goal);

  if (pathNodes && pathNodes.length > 0) {
    world.path[request.entityId] = {
      nodes: pathNodes.map((node) => ({ ...node })),
      progress: 0,
      goal: { ...request.goal },
    };
    return finalizeRequest(request, "completed");
  }

  clearPathForEntity(world, request.entityId);
  return finalizeRequest(request, "failed");
};

export const pathfindingSystem: System = {
  id: "pathfinding",
  update: (world) => {
    if (world.pathRequests.length === 0) {
      return;
    }

    const nextQueue: PathRequest[] = [];

    for (const request of world.pathRequests) {
      const result = processRequest(world, request);
      if (result.status === "pending") {
        nextQueue.push(result);
      }
    }

    world.pathRequests = nextQueue;
  },
};

export default pathfindingSystem;
