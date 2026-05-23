import { useFrame } from "@react-three/fiber";
import React, { useRef } from "react";
import * as THREE from "three";

export const PlayerVisuals: React.FC = () => {
  const leftExhaustRef = useRef<THREE.Mesh>(null);
  const rightExhaustRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    // Animate the jetpack exhaust scales to simulate combustion/thrust
    const scale = 0.8 + Math.sin(elapsed * 25) * 0.2;
    if (leftExhaustRef.current) leftExhaustRef.current.scale.set(scale, scale * 1.5, scale);
    if (rightExhaustRef.current) rightExhaustRef.current.scale.set(scale, scale * 1.5, scale);
  });

  return (
    <group>
      {/* Head - Sci-Fi Helmet */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial color="#1a202c" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Glowing Visor */}
      <mesh position={[0, 0.45, -0.21]}>
        <boxGeometry args={[0.35, 0.1, 0.05]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Torso - Robot Body */}
      <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.65, 0.8, 0.45]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Core Emitter on Chest */}
      <mesh position={[0, -0.1, -0.23]}>
        <boxGeometry args={[0.15, 0.15, 0.05]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>

      {/* Left Arm / Tool Joint */}
      <group position={[-0.45, -0.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.7, 0.25]} />
          <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Arm attachment */}
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.18, 0.2, 0.2]} />
          <meshStandardMaterial color="#ff8800" />
        </mesh>
      </group>

      {/* Right Arm / Drill Joint */}
      <group position={[0.45, -0.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.7, 0.25]} />
          <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Arm attachment */}
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.18, 0.2, 0.2]} />
          <meshStandardMaterial color="#ff8800" />
        </mesh>
      </group>

      {/* Left Leg */}
      <mesh position={[-0.2, -0.9, 0]} castShadow>
        <boxGeometry args={[0.22, 0.5, 0.3]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Right Leg */}
      <mesh position={[0.2, -0.9, 0]} castShadow>
        <boxGeometry args={[0.22, 0.5, 0.3]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Back Jetpack Thrusters */}
      <group position={[0, -0.2, 0.28]}>
        {/* Main Pack */}
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.5, 0.15]} />
          <meshStandardMaterial color="#4a5568" metalness={0.85} roughness={0.15} />
        </mesh>

        {/* Left Thruster Cylinder */}
        <mesh position={[-0.15, -0.2, 0.05]} rotation={[0.05, 0, -0.05]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
          <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Left Thrust Flame */}
        <mesh position={[-0.15, -0.5, 0.05]} ref={leftExhaustRef} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.06, 0.3, 8]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
        </mesh>

        {/* Right Thruster Cylinder */}
        <mesh position={[0.15, -0.2, 0.05]} rotation={[0.05, 0, 0.05]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
          <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Right Thrust Flame */}
        <mesh position={[0.15, -0.5, 0.05]} ref={rightExhaustRef} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.06, 0.3, 8]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
};
