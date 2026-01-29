import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BufferGeometry, InstancedMesh, Material, Mesh } from "three";
import { InstancedBufferAttribute, Vector3 } from "three";

import { getConfig } from "../config/index";
import { ensureGeometryHasVertexColors } from "../render/instanced";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { playSound } from "../utils/audio";
import type { FlashHandle } from "./drones/FlashEffect";
import { FlashEffect } from "./drones/FlashEffect";
import type { ParticleHandle } from "./drones/Particles";
import { Particles } from "./drones/Particles";
import { updateDronesFrame } from "./drones/updateDronesFrame";
import type { FloatingTextHandle } from "./effects/FloatingTextSystem";
import { FloatingTextSystem } from "./effects/FloatingTextSystem";

const MAX_DRONES = 512;

type DroneMeshLoaderProps = {
  path: string;
  onLoad: (geo: BufferGeometry, mat: Material) => void;
};

// Component that suspends while loading the GLB
const DroneMeshLoader: React.FC<DroneMeshLoaderProps> = ({ path, onLoad }) => {
  const { scene } = useGLTF(path);

  useEffect(() => {
    let foundGeo: BufferGeometry | null = null;
    let foundMat: Material | null = null;

    scene.traverse((child) => {
      if ((child as Mesh).isMesh && !foundGeo) {
        const mesh = child as Mesh;
        foundGeo = mesh.geometry;
        foundMat = mesh.material as Material;
      }
    });

    if (foundGeo && foundMat) {
      onLoad(foundGeo, foundMat);
    }
  }, [scene, onLoad]);

  return null;
};

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

  const positionsRef = useRef<Float32Array | null>(null);
  const targetsRef = useRef<Float32Array | null>(null);
  const statesRef = useRef<Uint8Array | null>(null);
  const rolesRef = useRef<Uint8Array | null>(null);
  const minedPositionsRef = useRef<Float32Array | null>(null);
  const depositEventsRef = useRef<{ x: number; y: number; z: number; amount: number }[] | null>(
    null,
  );

  const particlesRef = useRef<ParticleHandle>(null);
  const flashRef = useRef<FlashHandle>(null);
  const floatingTextRef = useRef<FloatingTextHandle>(null);

  const bodyMeshRef = useRef<InstancedMesh>(null);
  const miningLaserMeshRef = useRef<InstancedMesh>(null);
  const scanningLaserMeshRef = useRef<InstancedMesh>(null);
  const targetBoxMeshRef = useRef<InstancedMesh>(null);

  const ensureInstanceColors = useCallback((mesh: InstancedMesh, nextCapacity: number) => {
    ensureGeometryHasVertexColors(mesh.geometry);
    const colors = new Float32Array(nextCapacity * 3);
    colors.fill(1);
    mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
    mesh.geometry.setAttribute("instanceColor", mesh.instanceColor);
    mesh.instanceColor.needsUpdate = true;
  }, []);

  useLayoutEffect(() => {
    const bodyMesh = bodyMeshRef.current;
    if (bodyMesh) {
      ensureInstanceColors(bodyMesh, MAX_DRONES);
      bodyMesh.count = 0;
    }
  }, [ensureInstanceColors, droneGeo, droneMat]); // Re-run when geometry/material changes

  useLayoutEffect(() => {
    const targetBoxMesh = targetBoxMeshRef.current;
    if (targetBoxMesh) {
      ensureInstanceColors(targetBoxMesh, MAX_DRONES);
      targetBoxMesh.count = 0;
    }

    const miningLaserMesh = miningLaserMeshRef.current;
    if (miningLaserMesh) miningLaserMesh.count = 0;

    const scanningLaserMesh = scanningLaserMeshRef.current;
    if (scanningLaserMesh) scanningLaserMesh.count = 0;
  }, [ensureInstanceColors]);

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

  useEffect(() => {
    return bridge.onFrame((frame) => {
      positionsRef.current = frame.delta.entities ?? null;
      targetsRef.current = frame.delta.entityTargets ?? null;
      statesRef.current = frame.delta.entityStates ?? null;
      rolesRef.current = frame.delta.entityRoles ?? null;
      minedPositionsRef.current = frame.delta.minedPositions ?? null;
      depositEventsRef.current = frame.delta.depositEvents ?? null;
    });
  }, [bridge]);

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

      {droneGeo && droneMat ?
        <instancedMesh
          ref={bodyMeshRef}
          args={[droneGeo, droneMat, MAX_DRONES]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      : <instancedMesh
          ref={bodyMeshRef}
          args={[undefined, undefined, MAX_DRONES]}
          castShadow
          receiveShadow
          frustumCulled={false}
        >
          <coneGeometry args={[0.3, 0.8, 4]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#004444"
            emissiveIntensity={0.75}
            roughness={0.2}
            vertexColors={true}
          />
        </instancedMesh>
      }

      <instancedMesh
        ref={miningLaserMeshRef}
        args={[undefined, undefined, MAX_DRONES]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.05, 0.05, 1, 8, 1, true]} />
        <meshBasicMaterial
          color="#ff3333"
          transparent
          opacity={0.7}
          blending={2}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={scanningLaserMeshRef}
        args={[undefined, undefined, MAX_DRONES]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.015, 0.015, 1, 4, 1, true]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          blending={2}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={targetBoxMeshRef}
        args={[undefined, undefined, MAX_DRONES]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={0.5}
          depthWrite={false}
          vertexColors={true}
        />
      </instancedMesh>
    </group>
  );
};
