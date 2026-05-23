import { useFrame } from "@react-three/fiber";
import React, { useRef, useState } from "react";
import * as THREE from "three";

import { getSimBridge } from "../simBridge/simBridge";

interface OutpostItem {
  id: string;
  x: number;
  y: number;
  z: number;
}

const OutpostComponent: React.FC<OutpostItem> = ({ x, y, z }) => {
  const beaconRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (beaconRef.current) {
      // Pulsing glow effect for the beacon light
      const intensity = 0.4 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
      (beaconRef.current.material as THREE.MeshBasicMaterial).opacity = intensity;
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Base metal platform */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.0, 2.0, 0.4, 16]} />
        <meshStandardMaterial color="#2d3748" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main core tower structure */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 1.0, 1.2, 16]} />
        <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Glowing orange central power core */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ff7700" />
      </mesh>

      {/* Solar Panel Wing Left */}
      <mesh position={[-1.2, 0.8, 0]} rotation={[0, 0, 0.4]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.9]} />
        <meshStandardMaterial color="#1a202c" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Solar Panel Wing Right */}
      <mesh position={[1.2, 0.8, 0]} rotation={[0, 0, -0.4]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.9]} />
        <meshStandardMaterial color="#1a202c" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Antenna mast */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
        <meshStandardMaterial color="#718096" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Beacon Light Ball */}
      <mesh position={[0, 2.35, 0]} ref={beaconRef}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#00ffcc" transparent />
      </mesh>
    </group>
  );
};

export const Outposts: React.FC = () => {
  const [outpostList, setOutpostList] = useState<OutpostItem[]>([]);
  const bridge = getSimBridge();
  const lastLengthRef = useRef(-1);

  useFrame(() => {
    const frame = bridge.getLastFrame();
    if (!frame || !frame.delta.outposts) return;

    const outposts = frame.delta.outposts;
    if (outposts.length !== lastLengthRef.current) {
      lastLengthRef.current = outposts.length;
      setOutpostList(
        outposts.map((op) => ({
          id: op.id,
          x: op.x,
          y: op.y,
          z: op.z,
        })),
      );
    }
  });

  return (
    <group>
      {outpostList.map((op) => (
        <OutpostComponent key={op.id} id={op.id} x={op.x} y={op.y} z={op.z} />
      ))}
    </group>
  );
};
