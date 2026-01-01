import React, { useMemo } from "react";
import * as THREE from "three";
import { getVoxelColor } from "../../utils";

interface SimplifiedChunkProps {
  cx: number;
  cy: number;
  cz: number;
  size: number;
  lodLevel: number; // 1 = Medium, 2 = Far
}

export const SimplifiedChunk: React.FC<SimplifiedChunkProps> = ({
  cx,
  cy,
  cz,
  size,
  lodLevel,
}) => {
  // World position of chunk center
  const position = useMemo(
    () => new THREE.Vector3(cx * size + size / 2, cy * size + size / 2, cz * size + size / 2),
    [cx, cy, cz, size]
  );

  // For LOD2 (Far), render a simple proxy box
  // For LOD1 (Medium), we could do something more complex later. For now, proxy.
  
  // Use a distinct color or visual for proxy to identify it
  const color = useMemo(() => {
    // Just pick a color based on height or something simple
    return getVoxelColor(cy * size, -20); // using -20 as dummy water level
  }, [cy, size]);

  if (lodLevel >= 1) {
    return (
      <mesh position={position}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.3} 
          wireframe={lodLevel === 1} // Wireframe for medium, box for far? Or vice versa
        />
      </mesh>
    );
  }

  return null;
};
