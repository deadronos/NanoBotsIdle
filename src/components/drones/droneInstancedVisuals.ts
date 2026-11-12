import type { InstancedMesh } from "three";
import { Color, Matrix4, Object3D, Quaternion, Vector3 } from "three";

import type { Config } from "../../config/index";
import { DRONE_STATE_ID } from "../../shared/droneState";

const _tmp = new Object3D();
const _pos = new Vector3();
const _target = new Vector3();
const _dir = new Vector3();
const _quat = new Quaternion();
const _unitY = new Vector3(0, 1, 0);
const _forward = new Vector3();
const _right = new Vector3();
const _up = new Vector3();
const _bodyBasis = new Matrix4();

// Limit pitch during steep climbs and descents so the body stays readable.
const MAX_FLIGHT_SLOPE = Math.tan(Math.PI / 6);

const getFlightHistory = (mesh: InstancedMesh, capacity: number) => {
  const cached = mesh.userData.flightHistory as Float32Array | undefined;
  if (cached && cached.length >= capacity * 6) return cached;
  const history = new Float32Array(capacity * 6).fill(NaN);
  if (cached) history.set(cached);
  mesh.userData.flightHistory = history;
  return history;
};

const _colorMiner = new Color(0x66ccff);
const _colorHauler = new Color(0xffaa00);
const _colorCargo = new Color(0xfad577);
const _colorQueuing = new Color(0xff6600);
const _colorMining = new Color(0xff4444);
const _colorMoving = new Color(0x44ff44);

let _cachedCapacity = 0;
let _bobbingCache: Float32Array | null = null;
let _pulseCache: Float32Array | null = null;
let _jitterCache: Float32Array | null = null;

const applyInstanceUpdates = (
  mesh: InstancedMesh,
  options: {
    matrix?: boolean;
    color?: boolean;
    matrixRange?: { start: number; end: number };
    colorRange?: { start: number; end: number };
  },
) => {
  if (options.matrix) mesh.instanceMatrix.needsUpdate = true;
  if (options.color && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (options.matrixRange) {
    mesh.instanceMatrix.addUpdateRange(
      options.matrixRange.start * 16,
      (options.matrixRange.end - options.matrixRange.start + 1) * 16,
    );
    mesh.instanceMatrix.needsUpdate = true;
  }
  if (options.colorRange && mesh.instanceColor) {
    mesh.instanceColor.addUpdateRange(
      options.colorRange.start * 3,
      (options.colorRange.end - options.colorRange.start + 1) * 3,
    );
    mesh.instanceColor.needsUpdate = true;
  }
};

const ensureUint8Cache = (
  mesh: InstancedMesh,
  key: string,
  capacity: number,
  fillValue: number,
) => {
  if (!mesh.userData[key] || (mesh.userData[key] as Uint8Array).length < capacity) {
    const arr = new Uint8Array(capacity);
    arr.fill(fillValue);
    mesh.userData[key] = arr;
  }
  return mesh.userData[key] as Uint8Array;
};

const ensureInt8Cache = (mesh: InstancedMesh, key: string, capacity: number, fillValue: number) => {
  if (!mesh.userData[key] || (mesh.userData[key] as Int8Array).length < capacity) {
    const arr = new Int8Array(capacity);
    arr.fill(fillValue);
    mesh.userData[key] = arr;
  }
  return mesh.userData[key] as Int8Array;
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
  scales: Float32Array | null,
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
  // The bundled cockpit points along -Y. The fallback cone points along +Y.
  const noseSign = bodyMesh.userData.noseAxisSign === -1 ? -1 : 1;
  const flightHistory = getFlightHistory(bodyMesh, capacity);
  const roleCache = ensureUint8Cache(bodyMesh, "roleCache", capacity, 255);
  const targetStateCache = ensureInt8Cache(targetBoxMesh, "targetStateCache", capacity, -1);

  const count = Math.min(droneCount, Math.floor(positions.length / 3));

  // Pre-compute animation values once per frame instead of per-instance
  if (count > _cachedCapacity) {
    _cachedCapacity = Math.max(count, Math.ceil(_cachedCapacity * 1.5));
    _bobbingCache = new Float32Array(_cachedCapacity);
    _pulseCache = new Float32Array(_cachedCapacity);
    _jitterCache = new Float32Array(_cachedCapacity);
  }

  const bobbingSpeed = cfg.drones.visual.bobbing.speed;
  const bobbingAmp = cfg.drones.visual.bobbing.amplitude;
  const pulseFreq = cfg.drones.visual.targetBox.pulseFreq;
  const pulseAmp = cfg.drones.visual.targetBox.pulseAmplitude;
  const pulseBase = cfg.drones.visual.targetBox.baseScale;
  const jitterBase = cfg.drones.visual.miningLaser.baseWidth;
  const jitterAmp = cfg.drones.visual.miningLaser.jitterAmplitude;
  const payloadScaleAmp = cfg.drones.visual.payloadScaleAmplitude;

  for (let i = 0; i < count; i += 1) {
    _bobbingCache![i] = Math.sin(elapsedTime * bobbingSpeed + i) * bobbingAmp;
    _pulseCache![i] = pulseBase + Math.sin(elapsedTime * pulseFreq + i) * pulseAmp;
    _jitterCache![i] = jitterBase + Math.sin(elapsedTime * 40 + i) * jitterAmp;
  }

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

    const bob = _bobbingCache![i];
    _pos.set(x, y + bob, z);

    const targetX = targets[base];
    const targetY = targets[base + 1];
    const targetZ = targets[base + 2];
    const hasTarget =
      Number.isFinite(targetX) && Number.isFinite(targetY) && Number.isFinite(targetZ);

    const droneState = states[i] ?? DRONE_STATE_ID.SEEKING;
    const isMining = droneState === DRONE_STATE_ID.MINING && hasTarget;
    const isMoving = droneState === DRONE_STATE_ID.MOVING && hasTarget;

    // Payload-based scale
    const payloadRatio = scales ? scales[i] : 0;
    const s = 1.0 + payloadRatio * payloadScaleAmp;

    if (hasBodyColors) {
      const role = roles?.[i] ?? 0;
      const colorCode =
        droneState === DRONE_STATE_ID.QUEUING ? 3
        : payloadRatio > 0 ? 2
        : role;
      if (roleCache[i] !== colorCode) {
        roleCache[i] = colorCode;
        const color =
          colorCode === 3 ? _colorQueuing
          : colorCode === 2 ? _colorCargo
          : role === 1 ? _colorHauler
          : _colorMiner;
        bodyMesh.setColorAt(i, color);
        bodyColorsDirty = true;
        if (i < bodyColorMin) bodyColorMin = i;
        if (i > bodyColorMax) bodyColorMax = i;
      }
    }

    const history = i * 6;
    const dx = x - flightHistory[history];
    const dy = y - flightHistory[history + 1];
    const dz = z - flightHistory[history + 2];
    flightHistory[history] = x;
    flightHistory[history + 1] = y;
    flightHistory[history + 2] = z;

    const horizontal = Math.hypot(dx, dz);
    if (horizontal > 1e-4) {
      const limit = horizontal * MAX_FLIGHT_SLOPE;
      _forward.set(dx, Math.max(-limit, Math.min(limit, dy)), dz).normalize();
    } else if (Number.isFinite(flightHistory[history + 3])) {
      _forward.fromArray(flightHistory, history + 3);
      if (Math.abs(dy) > 1e-4) _forward.setY(0).normalize();
    } else {
      _forward.set(0, 0, 1);
    }
    _forward.toArray(flightHistory, history + 3);

    _right.crossVectors(_forward, _unitY).normalize();
    _up.crossVectors(_right, _forward);
    _right.multiplyScalar(noseSign);
    _forward.multiplyScalar(noseSign);
    _tmp.position.copy(_pos);
    _tmp.quaternion.setFromRotationMatrix(_bodyBasis.makeBasis(_right, _forward, _up));
    _tmp.scale.setScalar(s);
    _tmp.updateMatrix();
    bodyMesh.setMatrixAt(i, _tmp.matrix);

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

      // --- target box ---
      {
        const scale = _pulseCache![i];
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
            const colorObj = isMining ? _colorMining : _colorMoving;
            targetBoxMesh.setColorAt(i, colorObj);
            targetBoxColorsDirty = true;
            if (i < targetColorMin) targetColorMin = i;
            if (i > targetColorMax) targetColorMax = i;
          }
        }
      }

      // --- lasers ---
      if (isMining && dist > 1e-4) {
        const jitter = _jitterCache![i];
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
