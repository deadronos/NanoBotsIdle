import type { InstancedMesh } from "three";
import { Color, Object3D, Quaternion, Vector3 } from "three";

import type { Config } from "../../config/index";
import { applyInstanceUpdates } from "../../render/instanced";
import { DRONE_STATE_ID } from "../../shared/droneState";

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

const _tmp = new Object3D();
const _tmpColor = new Color();
const _pos = new Vector3();
const _target = new Vector3();
const _dir = new Vector3();
const _quat = new Quaternion();
const _unitY = new Vector3(0, 1, 0);

const ensureUint8Cache = (mesh: InstancedMesh, key: string, len: number, fillValue: number) => {
  const existing = mesh.userData[key] as Uint8Array | undefined;
  if (existing && existing.length >= len) return existing;
  const next = new Uint8Array(len);
  next.fill(fillValue);
  mesh.userData[key] = next;
  return next;
};

const ensureInt8Cache = (mesh: InstancedMesh, key: string, len: number, fillValue: number) => {
  const existing = mesh.userData[key] as Int8Array | undefined;
  if (existing && existing.length >= len) return existing;
  const next = new Int8Array(len);
  next.fill(fillValue);
  mesh.userData[key] = next;
  return next;
};

const hideInstanceAt = (mesh: InstancedMesh, index: number) => {
  _tmp.position.set(0, -9999, 0);
  _tmp.quaternion.identity();
  _tmp.scale.set(0, 0, 0);
  _tmp.updateMatrix();
  mesh.setMatrixAt(index, _tmp.matrix);
};

export const updateDroneInstancedVisuals = (
  cfg: Config,
  droneCount: number,
  positions: Float32Array,
  targets: Float32Array,
  states: Uint8Array,
  roles: Uint8Array | null,
  bodyMesh: InstancedMesh,
  miningLaserMesh: InstancedMesh,
  scanningLaserMesh: InstancedMesh,
  targetBoxMesh: InstancedMesh,
  elapsedTime: number,
) => {
  // Materials are shared across all instances; keep updates coarse-grained and stable.
  const miningMaterial = miningLaserMesh.material as unknown as { opacity?: number };
  if (typeof miningMaterial?.opacity === "number") {
    const targetOpacity =
      cfg.drones.visual.miningLaser.opacityBase +
      Math.sin(elapsedTime * cfg.drones.visual.miningLaser.opacityFreq) * 0.3;
    if (Math.abs(miningMaterial.opacity - targetOpacity) > 0.001) {
      miningMaterial.opacity = targetOpacity;
    }
  }

  const scanningMaterial = scanningLaserMesh.material as unknown as { opacity?: number };
  if (typeof scanningMaterial?.opacity === "number") {
    const targetOpacity =
      cfg.drones.visual.scanningLaser.opacityBase +
      Math.sin(elapsedTime * cfg.drones.visual.scanningLaser.opacityFreq) *
        cfg.drones.visual.scanningLaser.opacityAmplitude;
    if (Math.abs(scanningMaterial.opacity - targetOpacity) > 0.001) {
      scanningMaterial.opacity = targetOpacity;
    }
  }

  const capacity = bodyMesh.instanceMatrix?.count ?? bodyMesh.instanceColor?.count ?? 0;
  const roleCache = ensureUint8Cache(bodyMesh, "roleCache", capacity, 255);
  const targetStateCache = ensureInt8Cache(targetBoxMesh, "targetStateCache", capacity, -1);

  const count = Math.min(droneCount, Math.floor(positions.length / 3));

  bodyMesh.count = count;
  miningLaserMesh.count = count;
  scanningLaserMesh.count = count;
  targetBoxMesh.count = count;

  const hasBodyColors = bodyMesh.instanceColor !== null;
  const hasTargetBoxColors = targetBoxMesh.instanceColor !== null;
  let bodyColorsDirty = false;
  let targetBoxColorsDirty = false;
  let bodyColorMin = Number.POSITIVE_INFINITY;
  let bodyColorMax = Number.NEGATIVE_INFINITY;
  let targetColorMin = Number.POSITIVE_INFINITY;
  let targetColorMax = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < count; i += 1) {
    const base = i * 3;
    const x = positions[base];
    const y = positions[base + 1];
    const z = positions[base + 2];

    const bob =
      Math.sin(elapsedTime * cfg.drones.visual.bobbing.speed + i) *
      cfg.drones.visual.bobbing.amplitude;

    _pos.set(x, y + bob, z);

    const targetX = targets[base];
    const targetY = targets[base + 1];
    const targetZ = targets[base + 2];
    const hasTarget =
      Number.isFinite(targetX) && Number.isFinite(targetY) && Number.isFinite(targetZ);

    const droneState = states[i] ?? DRONE_STATE_ID.SEEKING;
    const isMining = droneState === DRONE_STATE_ID.MINING && hasTarget;
    const isMoving = droneState === DRONE_STATE_ID.MOVING && hasTarget;

    if (hasTarget) {
      _target.set(targetX, targetY, targetZ);
      _dir.subVectors(_target, _pos);
      const dist = _dir.length();

      if (dist > 1e-4) {
        _dir.multiplyScalar(1 / dist);
        _quat.setFromUnitVectors(_unitY, _dir);
      } else {
        _quat.identity();
      }

      // --- body ---
      _tmp.position.copy(_pos);
      _tmp.quaternion.copy(_quat);
      _tmp.scale.set(1, 1, 1);
      _tmp.updateMatrix();
      bodyMesh.setMatrixAt(i, _tmp.matrix);

      if (hasBodyColors) {
        const role = roles ? roles[i] : 0;
        if (roleCache[i] !== role) {
          roleCache[i] = role;
          const isHauler = role === 1;
          _tmpColor.setHex(isHauler ? ROLE_COLORS.HAULER : ROLE_COLORS.MINER);
          bodyMesh.setColorAt(i, _tmpColor);
          bodyColorsDirty = true;
          if (i < bodyColorMin) bodyColorMin = i;
          if (i > bodyColorMax) bodyColorMax = i;
        }
      }

      // --- target box ---
      {
        const scale =
          cfg.drones.visual.targetBox.baseScale +
          Math.sin(elapsedTime * cfg.drones.visual.targetBox.pulseFreq + i) *
            cfg.drones.visual.targetBox.pulseAmplitude;

        _tmp.position.copy(_target);
        _tmp.quaternion.identity();
        _tmp.rotation.set(0, elapsedTime * 0.5 + i * 0.1, 0);
        _tmp.scale.setScalar(scale);
        _tmp.updateMatrix();
        targetBoxMesh.setMatrixAt(i, _tmp.matrix);

        if (hasTargetBoxColors) {
          const stateCode = isMining ? 1 : 0;
          if (targetStateCache[i] !== stateCode) {
            targetStateCache[i] = stateCode;
            const targetColor = isMining ? TARGET_BOX_COLORS.MINING : TARGET_BOX_COLORS.MOVING;
            _tmpColor.setHex(targetColor);
            targetBoxMesh.setColorAt(i, _tmpColor);
            targetBoxColorsDirty = true;
            if (i < targetColorMin) targetColorMin = i;
            if (i > targetColorMax) targetColorMax = i;
          }
        }
      }

      // --- lasers ---
      if (isMining && dist > 1e-4) {
        const jitter =
          cfg.drones.visual.miningLaser.baseWidth +
          Math.sin(elapsedTime * 40 + i) * cfg.drones.visual.miningLaser.jitterAmplitude;
        _tmp.position.copy(_pos).addScaledVector(_dir, dist * 0.5);
        _tmp.quaternion.copy(_quat);
        _tmp.scale.set(jitter, dist, jitter);
        _tmp.updateMatrix();
        miningLaserMesh.setMatrixAt(i, _tmp.matrix);
      } else {
        hideInstanceAt(miningLaserMesh, i);
      }

      if (isMoving && dist > 1e-4) {
        _tmp.position.copy(_pos).addScaledVector(_dir, dist * 0.5);
        _tmp.quaternion.copy(_quat);
        _tmp.scale.set(1, dist, 1);
        _tmp.updateMatrix();
        scanningLaserMesh.setMatrixAt(i, _tmp.matrix);
      } else {
        hideInstanceAt(scanningLaserMesh, i);
      }

      continue;
    }

    // No target: hide lasers + target box, keep body visible.
    _tmp.position.copy(_pos);
    _tmp.quaternion.identity();
    _tmp.scale.set(1, 1, 1);
    _tmp.updateMatrix();
    bodyMesh.setMatrixAt(i, _tmp.matrix);

    if (hasBodyColors) {
      const role = roles ? roles[i] : 0;
      if (roleCache[i] !== role) {
        roleCache[i] = role;
        const isHauler = role === 1;
        _tmpColor.setHex(isHauler ? ROLE_COLORS.HAULER : ROLE_COLORS.MINER);
        bodyMesh.setColorAt(i, _tmpColor);
        bodyColorsDirty = true;
        if (i < bodyColorMin) bodyColorMin = i;
        if (i > bodyColorMax) bodyColorMax = i;
      }
    }

    if (targetStateCache[i] !== -1) {
      targetStateCache[i] = -1;
    }

    hideInstanceAt(miningLaserMesh, i);
    hideInstanceAt(scanningLaserMesh, i);
    hideInstanceAt(targetBoxMesh, i);
  }

  if (count > 0) {
    applyInstanceUpdates(bodyMesh, { matrixRange: { start: 0, end: count - 1 } });
    applyInstanceUpdates(miningLaserMesh, { matrixRange: { start: 0, end: count - 1 } });
    applyInstanceUpdates(scanningLaserMesh, { matrixRange: { start: 0, end: count - 1 } });
    applyInstanceUpdates(targetBoxMesh, { matrixRange: { start: 0, end: count - 1 } });
  } else {
    applyInstanceUpdates(bodyMesh, { matrix: true });
    applyInstanceUpdates(miningLaserMesh, { matrix: true });
    applyInstanceUpdates(scanningLaserMesh, { matrix: true });
    applyInstanceUpdates(targetBoxMesh, { matrix: true });
  }

  if (hasBodyColors && bodyColorsDirty) {
    if (bodyColorMin <= bodyColorMax) {
      applyInstanceUpdates(bodyMesh, { colorRange: { start: bodyColorMin, end: bodyColorMax } });
    } else {
      applyInstanceUpdates(bodyMesh, { color: true });
    }
  }
  if (hasTargetBoxColors && targetBoxColorsDirty) {
    if (targetColorMin <= targetColorMax) {
      applyInstanceUpdates(targetBoxMesh, {
        colorRange: { start: targetColorMin, end: targetColorMax },
      });
    } else {
      applyInstanceUpdates(targetBoxMesh, { color: true });
    }
  }
};
