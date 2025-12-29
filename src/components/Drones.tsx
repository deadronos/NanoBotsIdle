import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import type { Group, Mesh, PointLight } from "three";
import { Vector3 } from "three";

import { getConfig } from "../config/index";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import type { FlashHandle } from "./drones/FlashEffect";
import { FlashEffect } from "./drones/FlashEffect";
import type { ParticleHandle } from "./drones/Particles";
import { Particles } from "./drones/Particles";
import { updateDronesFrame } from "./drones/updateDronesFrame";

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

    const didConsumeMined = updateDronesFrame({
      cfg,
      droneCount: snapshot.droneCount,
      positions,
      targets,
      states,
      refs: {
        groupRefs: groupRefs.current,
        miningLaserRefs: miningLaserRefs.current,
        scanningLaserRefs: scanningLaserRefs.current,
        targetBoxRefs: targetBoxRefs.current,
        impactLightRefs: impactLightRefs.current,
      },
      effects: {
        particles: particlesRef.current,
        flash: flashRef.current,
      },
      tempWorldTarget: tempTarget.current,
      tempLocalTarget: tempLocal.current,
      frameState: state,
      minedPositions: minedPositionsRef.current,
    });

    if (didConsumeMined) {
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
