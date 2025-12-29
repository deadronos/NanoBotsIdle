import { Sky, Stars, Cloud, Clouds } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useRef } from "react";
import type { DirectionalLight, Group } from "three";
import * as THREE from "three";

export const Environment: React.FC = () => {
  const lightRef = useRef<DirectionalLight>(null);
  const cloudsRef = useRef<Group>(null);

  useFrame((state, delta) => {
    // Animate clouds slowly
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <group>
      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0}
        azimuth={0.25}
        turbidity={10}
        rayleigh={2}
      />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Clouds */}
      <group ref={cloudsRef} position={[0, 20, 0]}>
        <Clouds material={THREE.MeshBasicMaterial}>
          <Cloud segments={40} bounds={[20, 2, 20]} volume={10} color="#ecf0f1" />
          <Cloud seed={1} scale={2} volume={5} color="#bdc3c7" fade={100} />
        </Clouds>
      </group>

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
    </group>
  );
};
