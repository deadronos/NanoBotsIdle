export type PlayerConfig = {
  playerHeight: number;
  walkingSpeed: number;
  runningSpeed: number;
  jumpForce: number;
  gravity: number;
  swimSpeed: number;
  swimForce: number;
  buoyancy: number;
  waterDrag: number;
  respawnY?: number;
  killPlaneY?: number;
};

export const defaultPlayerConfig: PlayerConfig = {
  playerHeight: 1.8,
  walkingSpeed: 5.0,
  runningSpeed: 8.0,
  jumpForce: 8.0,
  gravity: 20.0,
  swimSpeed: 4.0,
  swimForce: 15.0,
  buoyancy: 15.0,
  waterDrag: 2.0,
  respawnY: 10,
  killPlaneY: -20,
};
