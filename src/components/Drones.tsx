import { useFrame } from "@react-three/fiber";
import React, { Suspense, useCallback, useRef, useState } from "react";
import type { BufferGeometry, InstancedMesh, Material } from "three";
import { Vector3 } from "three";

import { getConfig } from "../config/index";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { playSound } from "../utils/audio";
import { DroneInstancedMeshes } from "./drones/DroneInstancedMeshes";
import { DroneMeshLoader } from "./drones/DroneMeshLoader";
import type { FlashHandle } from "./drones/FlashEffect";
import { FlashEffect } from "./drones/FlashEffect";
import { useDroneMeshInit } from "./drones/hooks/useDroneMeshInit";
import { useDronesFrameDelta } from "./drones/hooks/useDronesFrameDelta";
import type { ParticleHandle } from "./drones/Particles";
import { Particles } from "./drones/Particles";
import { updateDronesFrame } from "./drones/updateDronesFrame";
import type { FloatingTextHandle } from "./effects/FloatingTextSystem";
import { FloatingTextSystem } from "./effects/FloatingTextSystem";

const MAX_DRONES = 512;

export const Drones: React.FC = () => {
  const cfg = getConfig();
  const droneCount = useUiStore((state) => state.snapshot.droneCount);
  const haulerCount = useUiStore((state) => state.snapshot.haulerCount);
  const bridge = getSimBridge();

  const [droneGeo, setDroneGeo] = useState<BufferGeometry | null>(null);
  const [droneMat, setDroneMat] = useState<Material | null>(null);

  const onGLBLoaded = useCallback((geo: BufferGeometry, mat: Material) => {
    setDroneGeo(geo);
    setDroneMat(mat);
  }, []);

  const {
    positionsRef,
    targetsRef,
    statesRef,
    rolesRef,
    minedPositionsRef,
    depositEventsRef,
  } = useDronesFrameDelta(bridge);

  const particlesRef = useRef<ParticleHandle>(null);
  const flashRef = useRef<FlashHandle>(null);
  const floatingTextRef = useRef<FloatingTextHandle>(null);

  const bodyMeshRef = useRef<InstancedMesh>(null);
  const miningLaserMeshRef = useRef<InstancedMesh>(null);
  const scanningLaserMeshRef = useRef<InstancedMesh>(null);
  const targetBoxMeshRef = useRef<InstancedMesh>(null);

  useDroneMeshInit({
    maxDrones: MAX_DRONES,
    bodyMeshRef,
    targetBoxMeshRef,
    miningLaserMeshRef,
    scanningLaserMeshRef,
    reinitKey: droneGeo ?? droneMat,
  });

  const frameOptionsRef = useRef<Parameters<typeof updateDronesFrame>[0]>({
    cfg,
    droneCount: 0,
    positions: new Float32Array(0),
    targets: new Float32Array(0),
    states: new Uint8Array(0),
    roles: null,
    refs: {
      bodyMesh: null,
      miningLaserMesh: null,
      scanningLaserMesh: null,
      targetBoxMesh: null,
    },
    effects: {
      particles: null,
      flash: null,
      floatingText: null,
    },
    elapsedTime: 0,
    minedPositions: null,
    depositEvents: null,
    tempWorldTarget: new Vector3(),
  });

  useFrame((state) => {
    const positions = positionsRef.current;
    const targets = targetsRef.current;
    const states = statesRef.current;
    if (!positions || !targets || !states) return;

    const totalDrones = droneCount + haulerCount;
    const available = Math.floor(positions.length / 3);
    const desired = Math.min(totalDrones, available, MAX_DRONES);

    const frameOptions = frameOptionsRef.current;
    const visualRefs = frameOptions.refs;
    visualRefs.bodyMesh = bodyMeshRef.current;
    visualRefs.miningLaserMesh = miningLaserMeshRef.current;
    visualRefs.scanningLaserMesh = scanningLaserMeshRef.current;
    visualRefs.targetBoxMesh = targetBoxMeshRef.current;

    frameOptions.effects.particles = particlesRef.current;
    frameOptions.effects.flash = flashRef.current;
    frameOptions.effects.floatingText = floatingTextRef.current;
    frameOptions.droneCount = desired;
    frameOptions.positions = positions;
    frameOptions.targets = targets;
    frameOptions.states = states;
    frameOptions.roles = rolesRef.current;
    frameOptions.elapsedTime = state.clock.elapsedTime;
    frameOptions.minedPositions = minedPositionsRef.current;
    frameOptions.depositEvents = depositEventsRef.current;

    const didConsumeMined = updateDronesFrame(frameOptions);

    if (didConsumeMined && minedPositionsRef.current && minedPositionsRef.current.length > 0) {
      minedPositionsRef.current = null;
      playSound("mine");
    }

    if (depositEventsRef.current && depositEventsRef.current.length > 0) {
      playSound("deposit");
    }

    // Always clear deposit events after frame
    depositEventsRef.current = null;
  });

  return (
    <group>
      <Particles ref={particlesRef} />
      <FlashEffect ref={flashRef} />
      <FloatingTextSystem ref={floatingTextRef} />

      {cfg.drones.useGLBMesh && (
        <Suspense fallback={null}>
          <DroneMeshLoader path={cfg.drones.glbPath} onLoad={onGLBLoaded} />
        </Suspense>
      )}

      <DroneInstancedMeshes
        maxDrones={MAX_DRONES}
        bodyMeshRef={bodyMeshRef}
        miningLaserMeshRef={miningLaserMeshRef}
        scanningLaserMeshRef={scanningLaserMeshRef}
        targetBoxMeshRef={targetBoxMeshRef}
        droneGeo={droneGeo}
        droneMat={droneMat}
      />
    </group>
  );
};
