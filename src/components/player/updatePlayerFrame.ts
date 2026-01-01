import type { Camera, Group, Vector3 } from "three";

import type { Config } from "../../config/index";
import { getVoxelMaterialAt, MATERIAL_BEDROCK, MATERIAL_SOLID } from "../../sim/collision";
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

  // Pre-compute trig values used multiple times
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  const sinPitch = Math.sin(pitch);
  const cosPitch = Math.cos(pitch);

  forward.set(-sinYaw, 0, -cosYaw);
  right.set(cosYaw, 0, -sinYaw);

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

  // Use pre-computed trig values
  lookDir.set(-sinYaw * cosPitch, sinPitch, -cosYaw * cosPitch);

  if (viewMode === "FIRST_PERSON") {
    camera.position.copy(position);
    lookAt.copy(position).add(lookDir);
    camera.lookAt(lookAt);
    return;
  }

  const cameraOffsetDist = 5;
  const targetCamPos = camPos
    .copy(position)
    .sub(camOffset.copy(lookDir).multiplyScalar(cameraOffsetDist));
  targetCamPos.y += 1.0;

  // Camera Collision Check
  // Trace from player head position to target camera position
  const headPos = temps.lookAt.copy(position);
  headPos.y += 1.0;

  let finalDist = cameraOffsetDist;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const checkPos = temps.direction.copy(headPos).lerp(targetCamPos, t);
    const mat = getVoxelMaterialAt(
      Math.round(checkPos.x),
      Math.round(checkPos.y),
      Math.round(checkPos.z),
      prestigeLevel,
    );

    if (mat === MATERIAL_SOLID || mat === MATERIAL_BEDROCK) {
      // Hit a block, shorten distance
      // We take the distance from headPos to the point just before the hit
      finalDist = headPos.distanceTo(checkPos) - 0.5;
      break;
    }
  }

  finalDist = Math.max(0.5, finalDist);
  camPos.copy(headPos).sub(camOffset.copy(lookDir).multiplyScalar(finalDist));

  camera.position.lerp(camPos, 0.2);
  camera.lookAt(headPos);
};
