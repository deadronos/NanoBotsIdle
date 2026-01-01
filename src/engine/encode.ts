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
    } as const;
  }

  const entities = new Float32Array(drones.length * 3);
  const entityTargets = new Float32Array(drones.length * 3);
  const entityStates = new Uint8Array(drones.length);
  const entityRoles = new Uint8Array(drones.length);

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
    entityStates[i] = stateValue;

    entityRoles[i] = drone.role === "HAULER" ? 1 : 0;

    entityTargets[base] = drone.targetX;
    entityTargets[base + 1] = drone.targetY;
    entityTargets[base + 2] = drone.targetZ;
  }

  return { entities, entityTargets, entityStates, entityRoles } as const;
};
