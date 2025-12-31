import React, { useEffect, useMemo, useRef } from "react";
import { Color,type InstancedMesh, Object3D } from "three";

import { getGroundHeightWithEdits } from "../../sim/collision";
import { forEachRadialChunk, getVoxelColor } from "../../utils";
import { ensureInstanceColors } from "./instancedVoxels/voxelInstanceMesh";

export const FrontierFillRenderer: React.FC<{
  chunkSize: number;
  prestigeLevel: number;
  radius: number;
  center: { cx: number; cy: number; cz: number };
  bedrockY: number;
  waterLevel: number;
  debugVisuals?: boolean;
}> = ({ bedrockY, center, chunkSize, prestigeLevel, radius, waterLevel, debugVisuals = false }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useRef(new Color());
  // Use a reasonably high limit for fill (3x3 chunks * 20 depth ~ 45k voxels)
  const MAX_INSTANCES = 150000;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!debugVisuals) {
      ensureInstanceColors(mesh, MAX_INSTANCES);
    }

    let index = 0;

    // Radius 0 = 1 chunk, Radius 1 = 3x3 chunks.
    // Limit vertical fill depth to avoid overcrowding/lag.
    // We mainly care about holes near surface.
    const FILL_DEPTH = 30;

    forEachRadialChunk(center, radius, 3, (c) => {
      const minX = c.cx * chunkSize;
      const maxX = minX + chunkSize;
      const minZ = c.cz * chunkSize;
      const maxZ = minZ + chunkSize;

      for (let x = minX; x < maxX; x++) {
        for (let z = minZ; z < maxZ; z++) {
          if (index >= MAX_INSTANCES) break;

          const groundY = getGroundHeightWithEdits(x, z, prestigeLevel);
          // Standard frontier renders the surface (groundY). We want to fill *below* it to plug holes.
          // However, user reports "holes" persisting, which means the surface block ITSELF is often missing from the frontier stream.
          // To fix this, we must render the fill starting AT groundY (the surface).
          // This will cause Z-fighting (flickering) where the frontier *does* exist, but that is preferable to seeing through the world.
          // In the future, we could pass the frontierKeys set to selectively fill only missing keys, but that requires frequent rebuilds.
          const startY = Math.max(bedrockY, groundY - FILL_DEPTH);

          for (let y = groundY; y >= startY; y--) {
            if (index >= MAX_INSTANCES) break;

            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);

            if (!debugVisuals && mesh.instanceColor) {
              const c = getVoxelColor(y, waterLevel);
              tmpColor.current.setHex(c);
              mesh.setColorAt(index, tmpColor.current);
            }

            index++;
          }
        }
      }
    });

    mesh.count = index;
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [
    bedrockY,
    center,
    chunkSize,
    dummy,
    prestigeLevel,
    radius,
    debugVisuals,
    waterLevel,
    MAX_INSTANCES,
  ]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]}>
      <boxGeometry args={[1, 1, 1]} />
      {debugVisuals ?
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} depthWrite={false} />
      : <meshStandardMaterial roughness={0.8} metalness={0.1} vertexColors={true} />}
    </instancedMesh>
  );
};
