import { useFrame } from "@react-three/fiber";
import React, { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { InstancedMesh } from "three";
import { DynamicDrawUsage, Object3D } from "three";

export const DroneCargo: React.FC<{
  capacity: number;
  positionsRef: RefObject<Float32Array | null>;
  cargoRef: RefObject<Float32Array | null>;
}> = ({ capacity, positionsRef, cargoRef }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const [transform] = useState(() => new Object3D());

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const positions = positionsRef.current;
    const cargo = cargoRef.current;
    const limit = Math.min(capacity, cargo?.length ?? 0, (positions?.length ?? 0) / 3);
    let count = 0;
    if (positions && cargo) {
      for (let i = 0; i < limit; i++) {
        if (cargo[i] <= 0) continue;
        const base = i * 3;
        transform.position.set(positions[base], positions[base + 1] - 0.75, positions[base + 2]);
        transform.scale.setScalar(0.65 + cargo[i] * 0.35);
        transform.updateMatrix();
        mesh.setMatrixAt(count++, transform.matrix);
      }
    }
    mesh.count = count;
    if (count > 0) mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
      <boxGeometry args={[0.45, 0.34, 0.45]} />
      <meshBasicMaterial color="#ffc35b" />
    </instancedMesh>
  );
};
