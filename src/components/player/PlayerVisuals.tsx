import React from "react";

export const PlayerVisuals: React.FC = () => {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, -0.9, 0]} castShadow>
        <boxGeometry args={[0.6, 1.8, 0.4]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#ffccaa" />
        {/* Face Details */}
        <mesh position={[0.1, 0.05, -0.21]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color="black" />
        </mesh>
        <mesh position={[-0.1, 0.05, -0.21]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color="black" />
        </mesh>
      </mesh>
    </group>
  );
};
