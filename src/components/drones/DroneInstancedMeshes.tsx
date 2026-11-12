import React, { type RefObject } from "react";
import { type BufferGeometry, Color, type InstancedMesh, type Material } from "three";

// HDR red (above 1.0, not tone mapped) so the mining beam blooms.
const MINING_LASER_COLOR = new Color(3.5, 0.5, 0.35);

export const DroneInstancedMeshes: React.FC<{
  maxDrones: number;
  bodyMeshRef: RefObject<InstancedMesh | null>;
  miningLaserMeshRef: RefObject<InstancedMesh | null>;
  scanningLaserMeshRef: RefObject<InstancedMesh | null>;
  targetBoxMeshRef: RefObject<InstancedMesh | null>;
  droneGeo: BufferGeometry | null;
  droneMat: Material | null;
}> = ({
  maxDrones,
  bodyMeshRef,
  miningLaserMeshRef,
  scanningLaserMeshRef,
  targetBoxMeshRef,
  droneGeo,
  droneMat,
}) => {
  return (
    <>
      {droneGeo && droneMat ?
        <instancedMesh
          ref={bodyMeshRef}
          args={[droneGeo, droneMat, maxDrones]}
          userData-noseAxisSign={-1}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      : <instancedMesh
          ref={bodyMeshRef}
          args={[undefined, undefined, maxDrones]}
          castShadow
          receiveShadow
          frustumCulled={false}
        >
          <coneGeometry args={[0.3, 0.8, 4]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#004444"
            emissiveIntensity={0.75}
            roughness={0.2}
            vertexColors={true}
          />
        </instancedMesh>
      }

      <instancedMesh
        ref={miningLaserMeshRef}
        args={[undefined, undefined, maxDrones]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.05, 0.05, 1, 8, 1, true]} />
        <meshBasicMaterial
          color={MINING_LASER_COLOR}
          transparent
          opacity={0.7}
          blending={2}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={scanningLaserMeshRef}
        args={[undefined, undefined, maxDrones]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.015, 0.015, 1, 4, 1, true]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.3}
          blending={2}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={targetBoxMeshRef}
        args={[undefined, undefined, maxDrones]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={0.5}
          depthWrite={false}
          vertexColors={true}
        />
      </instancedMesh>
    </>
  );
};
