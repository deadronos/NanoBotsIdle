import { DRONE_STATE_ID, type DroneStateId } from "../shared/droneState";
import type { Drone } from "./drones";

export const toFloat32ArrayOrUndefined = (values: number[]) => {
  return values.length > 0 ? new Float32Array(values) : undefined;
};

export const encodeDrones = (drones: Drone[]) => {
  if (drones.length === 0) {
    return {
      entities: undefined,
      entityTargets: undefined,
      entityStates: undefined,
      entityRoles: undefined,
      entityCargo: undefined,
      returnRoutes: undefined,
    } as const;
  }

  const entities = new Float32Array(drones.length * 3);
  const entityTargets = new Float32Array(drones.length * 3);
  const entityStates = new Uint8Array(drones.length);
  const entityRoles = new Uint8Array(drones.length);
  const entityCargo = new Float32Array(drones.length);
  const returnRoutes = new Float32Array(drones.length * 2);

  for (let i = 0; i < drones.length; i += 1) {
    const base = i * 3;
    const drone = drones[i];

    entities[base] = drone.x;
    entities[base + 1] = drone.y;
    entities[base + 2] = drone.z;

    let stateValue: DroneStateId = DRONE_STATE_ID.SEEKING;
    if (drone.state === "MOVING") stateValue = DRONE_STATE_ID.MOVING;
    if (drone.state === "MINING") stateValue = DRONE_STATE_ID.MINING;
    if (drone.state === "QUEUING") stateValue = DRONE_STATE_ID.QUEUING;
    if (drone.state === "RETURNING") stateValue = DRONE_STATE_ID.RETURNING;
    if (drone.state === "DEPOSITING") stateValue = DRONE_STATE_ID.DEPOSITING;
    if (drone.state === "FETCHING") stateValue = DRONE_STATE_ID.FETCHING;
    entityStates[i] = stateValue;

    entityRoles[i] = drone.role === "HAULER" ? 1 : 0;
    entityCargo[i] = Math.min(1, drone.payload / Math.max(1, drone.maxPayload));
    const route =
      drone.state === "RETURNING" || drone.state === "QUEUING" || drone.state === "DEPOSITING" ?
        drone.routeOutpost
      : undefined;
    returnRoutes[i * 2] = route?.x ?? NaN;
    returnRoutes[i * 2 + 1] = route?.z ?? NaN;

    const hasTarget =
      drone.state === "MOVING" || drone.state === "MINING" || drone.state === "FETCHING";
    entityTargets[base] = hasTarget ? drone.targetX : NaN;
    entityTargets[base + 1] = hasTarget ? drone.targetY : NaN;
    entityTargets[base + 2] = hasTarget ? drone.targetZ : NaN;
  }

  return { entities, entityTargets, entityStates, entityRoles, entityCargo, returnRoutes } as const;
};
