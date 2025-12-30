import type { MutableRefObject } from "react";
import React from "react";
import type { Group, Mesh, PointLight } from "three";

export const DroneInstance: React.FC<{
  index: number;
  groupRefs: MutableRefObject<(Group | null)[]>;
  miningLaserRefs: MutableRefObject<(Mesh | null)[]>;
  scanningLaserRefs: MutableRefObject<(Mesh | null)[]>;
  targetBoxRefs: MutableRefObject<(Mesh | null)[]>;
  impactLightRefs: MutableRefObject<(PointLight | null)[]>;
}> = ({ groupRefs, impactLightRefs, index, miningLaserRefs, scanningLaserRefs, targetBoxRefs }) => {
  return (
    <group
      ref={(el) => {
        groupRefs.current[index] = el;
      }}
    >
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.3, 0.8, 4]} />
        <meshStandardMaterial color="#00ffcc" emissive="#004444" roughness={0.2} />
      </mesh>
      <pointLight distance={3} intensity={0.5} color="cyan" />

      <mesh
        ref={(el) => {
          miningLaserRefs.current[index] = el;
        }}
        visible={false}
      >
        <cylinderGeometry args={[0.05, 0.05, 1, 8, 1, true]} />
        <meshBasicMaterial
          color="#ff3333"
          transparent
          opacity={0.7}
          blending={2}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={(el) => {
          scanningLaserRefs.current[index] = el;
        }}
        visible={false}
      >
        <cylinderGeometry args={[0.015, 0.015, 1, 4, 1, true]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          blending={2}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={(el) => {
          targetBoxRefs.current[index] = el;
        }}
        visible={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial wireframe color="#00ffff" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <pointLight
        ref={(el) => {
          impactLightRefs.current[index] = el;
        }}
        distance={4}
        decay={2}
        color="#ffaa00"
        visible={false}
      />
    </group>
  );
};
