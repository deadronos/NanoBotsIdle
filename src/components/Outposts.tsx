import { useFrame } from "@react-three/fiber";
import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { applyInstanceUpdates } from "../render/instanced";
import { getSimBridge } from "../simBridge/simBridge";

const MAX_OUTPOSTS = 100;
const dummy = new THREE.Object3D();

export const Outposts: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const bridge = getSimBridge();

  useLayoutEffect(() => {
    if (meshRef.current) {
      // Init off screen
      meshRef.current.count = 0;
    }
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const frame = bridge.getLastFrame();
    if (!frame || !frame.delta.outposts) return;

    // In theory outposts are static, so we only need to update when changed.
    // But detecting change requires tracking ID hash or something.
    // For now, let's just update every frame or throttle?
    // Engine sends outposts array every frame? Yes, I added it to tick.
    // Optimization: Engine tick is frequent. Rebuilding matrix array every frame is ok for 10 items.

    const outposts = frame.delta.outposts;
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
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff8800" roughness={0.3} metalness={0.8} />
    </instancedMesh>
  );
};
