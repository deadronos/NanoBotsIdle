import type { MeshBasicMaterial, Vector3 } from "three";

import type { Config } from "../../config/index";
import { DRONE_STATE_ID } from "../../shared/droneState";
import type { DroneVisualRefs } from "./types";

export const updateDroneVisuals = (options: {
  cfg: Config;
  droneCount: number;
  positions: Float32Array;
  targets: Float32Array;
  states: Uint8Array;
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
          material.opacity =
            cfg.drones.visual.miningLaser.opacityBase +
            Math.sin(elapsedTime * cfg.drones.visual.miningLaser.opacityFreq) * 0.3;
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
          material.opacity =
            cfg.drones.visual.scanningLaser.opacityBase +
            Math.sin(elapsedTime * cfg.drones.visual.scanningLaser.opacityFreq) *
              cfg.drones.visual.scanningLaser.opacityAmplitude;
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
        material.color.setHex(isMining ? 0xff3333 : 0x00ffff);
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
