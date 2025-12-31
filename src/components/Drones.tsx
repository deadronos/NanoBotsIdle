import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import type { Group, Mesh, PointLight } from "three";
import { Vector3 } from "three";

import { getConfig } from "../config/index";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { DroneInstance } from "./drones/DroneInstance";
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
  const rolesRef = useRef<Uint8Array | null>(null);
  const minedPositionsRef = useRef<Float32Array | null>(null);

  const particlesRef = useRef<ParticleHandle>(null);
  const flashRef = useRef<FlashHandle>(null);

  const groupRefs = useRef<(Group | null)[]>([]);
  const bodyRefs = useRef<(Mesh | null)[]>([]);
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
      rolesRef.current = frame.delta.entityRoles ?? null;
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
      droneCount: snapshot.droneCount + snapshot.haulerCount,
      positions,
      targets,
      states,
      roles: rolesRef.current,
      refs: {
        groupRefs: groupRefs.current,
        bodyRefs: bodyRefs.current,
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
      {Array.from({ length: snapshot.droneCount + snapshot.haulerCount }).map((_, i) => (
        <DroneInstance
          key={i}
          index={i}
          groupRefs={groupRefs}
          bodyRefs={bodyRefs}
          miningLaserRefs={miningLaserRefs}
          scanningLaserRefs={scanningLaserRefs}
          targetBoxRefs={targetBoxRefs}
          impactLightRefs={impactLightRefs}
        />
      ))}
    </group>
  );
};
