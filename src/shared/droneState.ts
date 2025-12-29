export const DRONE_STATE_ID = {
  SEEKING: 0,
  MOVING: 1,
  MINING: 2,
} as const;

export type DroneStateId = (typeof DRONE_STATE_ID)[keyof typeof DRONE_STATE_ID];

