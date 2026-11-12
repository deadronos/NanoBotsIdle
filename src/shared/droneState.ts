export const DRONE_STATE_ID = {
  SEEKING: 0,
  MOVING: 1,
  MINING: 2,
  QUEUING: 3,
  RETURNING: 4,
  DEPOSITING: 5,
  FETCHING: 6,
} as const;

export type DroneStateId = (typeof DRONE_STATE_ID)[keyof typeof DRONE_STATE_ID];
