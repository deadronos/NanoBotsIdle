import type { MeshBasicMaterial, Vector3 } from "three";

import type { Config } from "../../config/index";
import { DRONE_STATE_ID } from "../../shared/droneState";
import type { DroneVisualRefs } from "./types";

// Cache role→color mapping to avoid repeated conversions
const ROLE_COLORS = {
  MINER: 0x00ffcc,
  HAULER: 0xffaa00,
} as const;

// Cache target box state colors
const TARGET_BOX_COLORS = {
  MINING: 0xff3333,
  MOVING: 0x00ffff,
} as const;

export const updateDroneVisuals = (options: {
  cfg: Config;
  droneCount: number;
  positions: Float32Array;
  targets: Float32Array;
  states: Uint8Array;
  roles: Uint8Array | null;
  refs: DroneVisualRefs;
  tempWorldTarget: Vector3;
  tempLocalTarget: Vector3;
  elapsedTime: number;
}) => {
  const {
    cfg,
    droneCount,
    positions,
    targets,
    states,
    roles,
    refs,
    tempWorldTarget,
    tempLocalTarget,
    elapsedTime,
  } = options;

  const count = Math.min(droneCount, Math.floor(positions.length / 3));

  for (let i = 0; i < count; i += 1) {
    const group = refs.groupRefs[i];
    if (!group) continue;

    const base = i * 3;
    const x = positions[base];
    const y = positions[base + 1];
    const z = positions[base + 2];

    const bob =
      Math.sin(elapsedTime * cfg.drones.visual.bobbing.speed + i) *
      cfg.drones.visual.bobbing.amplitude;
    group.position.set(x, y + bob, z);

    const body = refs.bodyRefs[i];
    if (body) {
      const role = roles ? roles[i] : 0;
      const isHauler = role === 1;
      const mat = body.material as MeshBasicMaterial; // Or MeshStandardMaterial

      // Only update color if it differs from current value
      const targetColor = isHauler ? ROLE_COLORS.HAULER : ROLE_COLORS.MINER;
      const currentColor = mat.color.getHex();
      if (currentColor !== targetColor) {
        mat.color.setHex(targetColor);
      }
    }

    const targetX = targets[base];
    const targetY = targets[base + 1];
    const targetZ = targets[base + 2];
    const hasTarget =
      Number.isFinite(targetX) && Number.isFinite(targetY) && Number.isFinite(targetZ);
    const droneState = states[i] ?? DRONE_STATE_ID.SEEKING;

    const isMining = droneState === DRONE_STATE_ID.MINING && hasTarget;
    const isMoving = droneState === DRONE_STATE_ID.MOVING && hasTarget;

    if (hasTarget) {
      tempWorldTarget.set(targetX, targetY, targetZ);
      group.lookAt(tempWorldTarget);

      tempLocalTarget.copy(tempWorldTarget);
      const localTarget = group.worldToLocal(tempLocalTarget);
      const dist = localTarget.length();

      const miningLaser = refs.miningLaserRefs[i];
      if (miningLaser) {
        miningLaser.visible = isMining;
        if (isMining) {
          const jitter =
            cfg.drones.visual.miningLaser.baseWidth +
            Math.sin(elapsedTime * 40) * cfg.drones.visual.miningLaser.jitterAmplitude;

          miningLaser.scale.set(jitter, dist, jitter);
          miningLaser.position.set(0, 0, 0).lerp(localTarget, 0.5);
          miningLaser.lookAt(localTarget);
          miningLaser.rotation.x += Math.PI / 2;

          const material = miningLaser.material as MeshBasicMaterial;
          const targetOpacity =
            cfg.drones.visual.miningLaser.opacityBase +
            Math.sin(elapsedTime * cfg.drones.visual.miningLaser.opacityFreq) * 0.3;

          // Only update opacity if it differs significantly (tolerance for floating point)
          if (Math.abs(material.opacity - targetOpacity) > 0.001) {
            material.opacity = targetOpacity;
          }
        }
      }

      const scanningLaser = refs.scanningLaserRefs[i];
      if (scanningLaser) {
        scanningLaser.visible = isMoving;
        if (isMoving) {
          scanningLaser.scale.set(1, dist, 1);
          scanningLaser.position.set(0, 0, 0).lerp(localTarget, 0.5);
          scanningLaser.lookAt(localTarget);
          scanningLaser.rotation.x += Math.PI / 2;

          const material = scanningLaser.material as MeshBasicMaterial;
          const targetOpacity =
            cfg.drones.visual.scanningLaser.opacityBase +
            Math.sin(elapsedTime * cfg.drones.visual.scanningLaser.opacityFreq) *
              cfg.drones.visual.scanningLaser.opacityAmplitude;

          // Only update opacity if it differs significantly
          if (Math.abs(material.opacity - targetOpacity) > 0.001) {
            material.opacity = targetOpacity;
          }
        }
      }

      const targetBox = refs.targetBoxRefs[i];
      if (targetBox) {
        targetBox.visible = true;
        targetBox.position.copy(localTarget);

        const scale =
          cfg.drones.visual.targetBox.baseScale +
          Math.sin(elapsedTime * cfg.drones.visual.targetBox.pulseFreq) *
            cfg.drones.visual.targetBox.pulseAmplitude;
        targetBox.scale.setScalar(scale);
        targetBox.rotation.y += 0.02;

        const material = targetBox.material as MeshBasicMaterial;
        const targetColor = isMining ? TARGET_BOX_COLORS.MINING : TARGET_BOX_COLORS.MOVING;
        const currentColor = material.color.getHex();

        // Only update color if it differs from current value
        if (currentColor !== targetColor) {
          material.color.setHex(targetColor);
        }
      }

      const impactLight = refs.impactLightRefs[i];
      if (impactLight) {
        impactLight.visible = isMining;
        if (isMining) {
          tempLocalTarget.set(targetX, targetY + 0.5, targetZ);
          const localImpact = group.worldToLocal(tempLocalTarget);
          impactLight.position.copy(localImpact);
          impactLight.intensity =
            cfg.drones.visual.impactLight.baseIntensity +
            Math.random() * cfg.drones.visual.impactLight.randomIntensity;
        }
      }
      continue;
    }

    const miningLaser = refs.miningLaserRefs[i];
    if (miningLaser) miningLaser.visible = false;
    const scanningLaser = refs.scanningLaserRefs[i];
    if (scanningLaser) scanningLaser.visible = false;
    const targetBox = refs.targetBoxRefs[i];
    if (targetBox) targetBox.visible = false;
    const impactLight = refs.impactLightRefs[i];
    if (impactLight) impactLight.visible = false;
  }
};
