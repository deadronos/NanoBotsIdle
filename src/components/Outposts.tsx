import { useFrame } from "@react-three/fiber";
import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { useConfig } from "../config/useConfig";
import { applyInstanceUpdates } from "../render/instanced";
import { getSimBridge } from "../simBridge/simBridge";

const MAX_OUTPOSTS = 100;
const dummy = new THREE.Object3D();

export const Outposts: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const bridge = getSimBridge();
  const cfg = useConfig();
  const lastLengthRef = useRef(-1);

  useLayoutEffect(() => {
    if (meshRef.current) {
      // Init off screen
      meshRef.current.count = 0;

      // Assign bounding sphere matching the world radius so frustum culling works correctly
      const radius = cfg.terrain.worldRadius ?? 30;
      meshRef.current.geometry.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(0, 0, 0),
        radius * 2 // generous boundary including heights/diagonals
      );
    }
  }, [cfg.terrain.worldRadius]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const frame = bridge.getLastFrame();
    if (!frame || !frame.delta.outposts) return;

    const outposts = frame.delta.outposts;
    
    // Only rebuild matrices when the number of outposts changes
    if (outposts.length === lastLengthRef.current) return;
    lastLengthRef.current = outposts.length;

    mesh.count = Math.min(outposts.length, MAX_OUTPOSTS);

    outposts.forEach((op: { x: number; y: number; z: number }, i: number) => {
      if (i >= MAX_OUTPOSTS) return;
      dummy.position.set(op.x, op.y + 1, op.z); // +1 because pivot center? Box is height 2, so center is +1.
      dummy.scale.set(4, 2, 4); // 4x4 footprint, 2 height
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    if (mesh.count > 0) {
      applyInstanceUpdates(mesh, { matrixRange: { start: 0, end: mesh.count - 1 } });
    } else {
      applyInstanceUpdates(mesh, { matrix: true });
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_OUTPOSTS]}
      castShadow
      receiveShadow
      frustumCulled={true}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff8800" roughness={0.3} metalness={0.8} />
    </instancedMesh>
  );
};

