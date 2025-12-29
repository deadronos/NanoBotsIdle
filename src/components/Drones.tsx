import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial, PointLight } from "three";
import { Vector3 } from "three";

import { getConfig } from "../config/index";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { getVoxelColor } from "../utils";
import type { FlashHandle } from "./drones/FlashEffect";
import { FlashEffect } from "./drones/FlashEffect";
import type { ParticleHandle } from "./drones/Particles";
import { Particles } from "./drones/Particles";

const DRONE_SEEKING = 0;
const DRONE_MOVING = 1;
const DRONE_MINING = 2;

export const Drones: React.FC = () => {
  const cfg = getConfig();
  const snapshot = useUiStore((state) => state.snapshot);
  const bridge = getSimBridge();

  const positionsRef = useRef<Float32Array | null>(null);
  const targetsRef = useRef<Float32Array | null>(null);
  const statesRef = useRef<Uint8Array | null>(null);
  const minedPositionsRef = useRef<Float32Array | null>(null);

  const particlesRef = useRef<ParticleHandle>(null);
  const flashRef = useRef<FlashHandle>(null);

  const groupRefs = useRef<(Group | null)[]>([]);
  const miningLaserRefs = useRef<(Mesh | null)[]>([]);
  const scanningLaserRefs = useRef<(Mesh | null)[]>([]);
  const targetBoxRefs = useRef<(Mesh | null)[]>([]);
  const impactLightRefs = useRef<(PointLight | null)[]>([]);

  const tempTarget = useRef(new Vector3());
  const tempLocal = useRef(new Vector3());

  useEffect(() => {
    return bridge.onFrame((frame) => {
      positionsRef.current = frame.delta.entities ?? null;
      targetsRef.current = frame.delta.entityTargets ?? null;
      statesRef.current = frame.delta.entityStates ?? null;
      minedPositionsRef.current = frame.delta.minedPositions ?? null;
    });
  }, [bridge]);

  useFrame((state) => {
    const positions = positionsRef.current;
    const targets = targetsRef.current;
    const states = statesRef.current;
    if (!positions || !targets || !states) return;

    const count = Math.min(snapshot.droneCount, Math.floor(positions.length / 3));

    for (let i = 0; i < count; i += 1) {
      const group = groupRefs.current[i];
      if (!group) continue;

      const base = i * 3;
      const x = positions[base];
      const y = positions[base + 1];
      const z = positions[base + 2];

      const bob = Math.sin(state.clock.elapsedTime * cfg.drones.visual.bobbing.speed + i) *
        cfg.drones.visual.bobbing.amplitude;
      group.position.set(x, y + bob, z);

      const targetX = targets[base];
      const targetY = targets[base + 1];
      const targetZ = targets[base + 2];
      const hasTarget = Number.isFinite(targetX) && Number.isFinite(targetY) && Number.isFinite(targetZ);
      const droneState = states[i] ?? DRONE_SEEKING;

      const isMining = droneState === DRONE_MINING && hasTarget;
      const isMoving = droneState === DRONE_MOVING && hasTarget;

      if (hasTarget) {
        tempTarget.current.set(targetX, targetY, targetZ);
        group.lookAt(tempTarget.current);
      }

      const miningLaser = miningLaserRefs.current[i];
      if (miningLaser) {
        miningLaser.visible = isMining;
        if (isMining && hasTarget) {
          tempLocal.current.set(targetX, targetY, targetZ);
          const localTarget = group.worldToLocal(tempLocal.current);
          const dist = localTarget.length();
          const jitter =
            cfg.drones.visual.miningLaser.baseWidth +
            Math.sin(state.clock.elapsedTime * 40) * cfg.drones.visual.miningLaser.jitterAmplitude;

          miningLaser.scale.set(jitter, dist, jitter);
          miningLaser.position.set(0, 0, 0).lerp(localTarget, 0.5);
          miningLaser.lookAt(localTarget);
          miningLaser.rotation.x += Math.PI / 2;

          const material = miningLaser.material as MeshBasicMaterial;
          material.opacity =
            cfg.drones.visual.miningLaser.opacityBase +
            Math.sin(state.clock.elapsedTime * cfg.drones.visual.miningLaser.opacityFreq) * 0.3;
        }
      }

      const scanningLaser = scanningLaserRefs.current[i];
      if (scanningLaser) {
        scanningLaser.visible = isMoving;
        if (isMoving && hasTarget) {
          tempLocal.current.set(targetX, targetY, targetZ);
          const localTarget = group.worldToLocal(tempLocal.current);
          const dist = localTarget.length();

          scanningLaser.scale.set(1, dist, 1);
          scanningLaser.position.set(0, 0, 0).lerp(localTarget, 0.5);
          scanningLaser.lookAt(localTarget);
          scanningLaser.rotation.x += Math.PI / 2;

          const material = scanningLaser.material as MeshBasicMaterial;
          material.opacity =
            cfg.drones.visual.scanningLaser.opacityBase +
            Math.sin(state.clock.elapsedTime * cfg.drones.visual.scanningLaser.opacityFreq) *
              cfg.drones.visual.scanningLaser.opacityAmplitude;
        }
      }

      const targetBox = targetBoxRefs.current[i];
      if (targetBox) {
        targetBox.visible = hasTarget;
        if (hasTarget) {
          tempLocal.current.set(targetX, targetY, targetZ);
          const localTarget = group.worldToLocal(tempLocal.current);
          targetBox.position.copy(localTarget);

          const scale =
            cfg.drones.visual.targetBox.baseScale +
            Math.sin(state.clock.elapsedTime * cfg.drones.visual.targetBox.pulseFreq) *
              cfg.drones.visual.targetBox.pulseAmplitude;
          targetBox.scale.setScalar(scale);
          targetBox.rotation.y += 0.02;

          const material = targetBox.material as MeshBasicMaterial;
          material.color.setHex(isMining ? 0xff3333 : 0x00ffff);
        }
      }

      const impactLight = impactLightRefs.current[i];
      if (impactLight) {
        impactLight.visible = isMining;
        if (isMining && hasTarget) {
          tempLocal.current.set(targetX, targetY + 0.5, targetZ);
          const localTarget = group.worldToLocal(tempLocal.current);
          impactLight.position.copy(localTarget);
          impactLight.intensity =
            cfg.drones.visual.impactLight.baseIntensity +
            Math.random() * cfg.drones.visual.impactLight.randomIntensity;
        }
      }
    }

    const minedPositions = minedPositionsRef.current;
    if (minedPositions && minedPositions.length > 0) {
      for (let i = 0; i < minedPositions.length; i += 3) {
        tempTarget.current.set(minedPositions[i], minedPositions[i + 1], minedPositions[i + 2]);
        const blockColor = getVoxelColor(tempTarget.current.y);
        if (flashRef.current) {
          flashRef.current.trigger(tempTarget.current);
        }
        if (particlesRef.current) {
          for (let j = 0; j < cfg.drones.particle.burstCount; j += 1) {
            particlesRef.current.spawn(tempTarget.current, blockColor);
          }
        }
      }
      minedPositionsRef.current = null;
    }
  });

  return (
    <group>
      <Particles ref={particlesRef} />
      <FlashEffect ref={flashRef} />
      {Array.from({ length: snapshot.droneCount }).map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.3, 0.8, 4]} />
            <meshStandardMaterial color="#00ffcc" emissive="#004444" roughness={0.2} />
          </mesh>
          <pointLight distance={3} intensity={0.5} color="cyan" />

          <mesh
            ref={(el) => {
              miningLaserRefs.current[i] = el;
            }}
            visible={false}
          >
            <cylinderGeometry args={[0.05, 0.05, 1, 8, 1, true]} />
            <meshBasicMaterial color="#ff3333" transparent opacity={0.7} blending={2} depthWrite={false} />
          </mesh>

          <mesh
            ref={(el) => {
              scanningLaserRefs.current[i] = el;
            }}
            visible={false}
          >
            <cylinderGeometry args={[0.015, 0.015, 1, 4, 1, true]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.3} blending={2} depthWrite={false} />
          </mesh>

          <mesh
            ref={(el) => {
              targetBoxRefs.current[i] = el;
            }}
            visible={false}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial wireframe color="#00ffff" transparent opacity={0.5} depthWrite={false} />
          </mesh>

          <pointLight
            ref={(el) => {
              impactLightRefs.current[i] = el;
            }}
            distance={4}
            decay={2}
            color="#ffaa00"
            visible={false}
          />
        </group>
      ))}
    </group>
  );
};
