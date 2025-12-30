import type { Camera, Group, Vector3 } from "three";

import type { Config } from "../../config/index";
import { getPlayerGroundHeight } from "../../sim/player";
import type { ViewMode } from "../../types";

type PlayerFrameTemps = {
  direction: Vector3;
  forward: Vector3;
  right: Vector3;
  lookDir: Vector3;
  lookAt: Vector3;
  camPos: Vector3;
  camOffset: Vector3;
};

export const updatePlayerFrame = (options: {
  cfg: Config;
  deltaSeconds: number;
  viewMode: ViewMode;
  prestigeLevel: number;
  keys: Record<string, boolean>;
  cameraAngle: { yaw: number; pitch: number };
  position: Vector3;
  velocity: Vector3;
  isJumping: { current: boolean };
  group: Group | null;
  playerVisuals: Group | null;
  camera: Camera;
  temps: PlayerFrameTemps;
}) => {
  const {
    cfg,
    deltaSeconds,
    viewMode,
    prestigeLevel,
    keys,
    cameraAngle,
    position,
    velocity,
    isJumping,
    group,
    playerVisuals,
    camera,
    temps,
  } = options;

  const { direction, forward, right, lookDir, lookAt, camPos, camOffset } = temps;
  const dt = deltaSeconds;

  const isUnderwater = position.y < cfg.terrain.waterLevel;
  const speed =
    isUnderwater ? cfg.player.swimSpeed
    : keys["ShiftLeft"] ? cfg.player.runningSpeed
    : cfg.player.walkingSpeed;

  const yaw = cameraAngle.yaw;
  const pitch = cameraAngle.pitch;

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));

  direction.set(0, 0, 0);
  if (keys["KeyW"]) direction.add(forward);
  if (keys["KeyS"]) direction.sub(forward);
  if (keys["KeyA"]) direction.sub(right);
  if (keys["KeyD"]) direction.add(right);

  if (direction.lengthSq() > 0) {
    direction.normalize().multiplyScalar(speed * dt);
  }

  position.x += direction.x;
  position.z += direction.z;

  if (isUnderwater) {
    isJumping.current = false;

    let swimVertical = 0;
    if (keys["Space"]) swimVertical += 1;
    if (keys["KeyC"]) swimVertical -= 1;

    velocity.y += swimVertical * cfg.player.swimForce * dt;
    velocity.y -= velocity.y * cfg.player.waterDrag * dt;
  } else {
    if (keys["Space"] && !isJumping.current) {
      velocity.y = cfg.player.jumpForce;
      isJumping.current = true;
    }

    velocity.y -= cfg.player.gravity * dt;
  }

  position.y += velocity.y * dt;

  const groundHeight = getPlayerGroundHeight(position.x, position.z, prestigeLevel);
  if (position.y < groundHeight) {
    position.y = groundHeight;
    velocity.y = Math.max(0, velocity.y);
    isJumping.current = false;
  }

  const killPlaneY = cfg.player.killPlaneY ?? Number.NEGATIVE_INFINITY;
  if (position.y < killPlaneY) {
    position.set(cfg.player.spawnX ?? 0, cfg.player.respawnY ?? 10, cfg.player.spawnZ ?? 0);
    velocity.set(0, 0, 0);
  }

  group?.position.copy(position);
  if (playerVisuals) {
    playerVisuals.rotation.y = yaw;
  }

  const cosPitch = Math.cos(pitch);
  lookDir.set(-Math.sin(yaw) * cosPitch, Math.sin(pitch), -Math.cos(yaw) * cosPitch);

  if (viewMode === "FIRST_PERSON") {
    camera.position.copy(position);
    lookAt.copy(position).add(lookDir);
    camera.lookAt(lookAt);
    return;
  }

  const cameraOffsetDist = 5;
  camPos.copy(position).sub(camOffset.copy(lookDir).multiplyScalar(cameraOffsetDist));
  camPos.y += 1.0;
  camera.position.lerp(camPos, 0.2);
  camera.lookAt(position);
};
