import React, { useRef } from 'react';
import { Sky, Stars, Cloud, Clouds } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

export const Environment: React.FC = () => {
  const cloudsRef = useRef<Group>(null);

  useFrame((state) => {
    // Animate clouds slowly
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <group>
      <Sky 
        distance={450000} 
        sunPosition={[100, 20, 100]} 
        inclination={0} 
        azimuth={0.25} 
        turbidity={10}
        rayleigh={2}
      />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[100, 100, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      <group ref={cloudsRef}>
         <Clouds material={THREE.MeshBasicMaterial}>
            <Cloud segments={40} bounds={[50, 10, 50]} volume={20} color="#fff" position={[0, 20, 0]} opacity={0.5} speed={0.1} />
            <Cloud segments={40} bounds={[50, 10, 50]} volume={20} color="#eed" position={[40, 25, -40]} opacity={0.4} speed={0.1} />
         </Clouds>
      </group>
      
      <fog attach="fog" args={['#87CEEB', 10, 90]} />
    </group>
  );
};

// Simple declaration to satisfy TS for THREE in JSX if not auto-imported
import * as THREE from 'three';
