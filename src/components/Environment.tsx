import { Stars } from "@react-three/drei";
import React, { useRef } from "react";
import type { DirectionalLight } from "three";
import { Color } from "three";

export const Environment: React.FC = () => {
  const lightRef = useRef<DirectionalLight>(null);

  return (
    <group>
      {/* Sky */}
      <color attach="background" args={[new Color("#87CEEB")]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Ambient Light */}
      <ambientLight intensity={0.4} />

      {/* Sun / Directional Light */}
      <directionalLight
        ref={lightRef}
        position={[50, 50, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={["#87CEEB", 20, 90]} />
    </group>
  );
};
