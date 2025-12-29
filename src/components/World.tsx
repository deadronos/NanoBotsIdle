import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { InstancedMesh } from "three";
import { Object3D } from "three";

import { getConfig } from "../config/index";
import { applyVoxelEdits, resetVoxelEdits } from "../sim/collision";
import { getSimBridge } from "../simBridge/simBridge";
import { getVoxelColor } from "../utils";

const keyFromCoords = (x: number, y: number, z: number) => `${x},${y},${z}`;

const getInitialCapacity = (radius: number) => {
  const surface = (radius * 2 + 1) ** 2;
  return Math.max(512, surface);
};

export const World: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const frontierPositions = useRef<number[]>([]);
  const frontierIndex = useRef<Map<string, number>>(new Map());
  const frontierCount = useRef(0);
  const needsRebuild = useRef(false);
  const tmp = useMemo(() => new Object3D(), []);

  const cfg = getConfig();
  const bridge = getSimBridge();
  const [capacity, setCapacity] = useState(() => getInitialCapacity(cfg.terrain.worldRadius));

  const ensureCapacity = useCallback(
    (count: number) => {
      if (count <= capacity) return;
      const nextCapacity = Math.max(count, Math.ceil(capacity * 1.5));
      needsRebuild.current = true;
      setCapacity(nextCapacity);
    },
    [capacity],
  );

  const setVoxelInstance = useCallback(
    (mesh: InstancedMesh, index: number, x: number, y: number, z: number) => {
      tmp.position.set(x, y, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(index, tmp.matrix);
      mesh.setColorAt(index, getVoxelColor(y));
    },
    [tmp],
  );

  const rebuildMesh = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const positions = frontierPositions.current;
    const count = positions.length / 3;
    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      setVoxelInstance(mesh, i, positions[base], positions[base + 1], positions[base + 2]);
    }
    mesh.count = count;
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [setVoxelInstance]);

  const loadFrontierSnapshot = useCallback(
    (positionsArray: Float32Array) => {
      const positions = Array.from(positionsArray);
      const map = new Map<string, number>();
      for (let i = 0; i < positions.length; i += 3) {
        map.set(keyFromCoords(positions[i], positions[i + 1], positions[i + 2]), i / 3);
      }
      frontierPositions.current = positions;
      frontierIndex.current = map;
      frontierCount.current = positions.length / 3;
      ensureCapacity(frontierCount.current);
      if (!needsRebuild.current) rebuildMesh();
    },
    [ensureCapacity, rebuildMesh],
  );

  const applyFrontierAdds = useCallback(
    (positionsArray: Float32Array) => {
      const mesh = meshRef.current;
      const positions = frontierPositions.current;
      const indexMap = frontierIndex.current;
      let updated = false;
      for (let i = 0; i < positionsArray.length; i += 3) {
        const x = positionsArray[i];
        const y = positionsArray[i + 1];
        const z = positionsArray[i + 2];
        const key = keyFromCoords(x, y, z);
        if (indexMap.has(key)) continue;
        const index = frontierCount.current;
        indexMap.set(key, index);
        positions.push(x, y, z);
        frontierCount.current += 1;
        if (mesh && !needsRebuild.current) {
          setVoxelInstance(mesh, index, x, y, z);
          updated = true;
        }
      }
      if (frontierCount.current > capacity) {
        ensureCapacity(frontierCount.current);
        return;
      }
      if (mesh && !needsRebuild.current && updated) {
        mesh.count = frontierCount.current;
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
    [capacity, ensureCapacity, setVoxelInstance],
  );

  const applyFrontierRemoves = useCallback(
    (positionsArray: Float32Array) => {
      const mesh = meshRef.current;
      const positions = frontierPositions.current;
      const indexMap = frontierIndex.current;
      let updated = false;
      for (let i = 0; i < positionsArray.length; i += 3) {
        const x = positionsArray[i];
        const y = positionsArray[i + 1];
        const z = positionsArray[i + 2];
        const key = keyFromCoords(x, y, z);
        const index = indexMap.get(key);
        if (index === undefined) continue;
        const lastIndex = frontierCount.current - 1;
        const lastBase = lastIndex * 3;
        if (index !== lastIndex) {
          const lastX = positions[lastBase];
          const lastY = positions[lastBase + 1];
          const lastZ = positions[lastBase + 2];
          positions[index * 3] = lastX;
          positions[index * 3 + 1] = lastY;
          positions[index * 3 + 2] = lastZ;
          const lastKey = keyFromCoords(lastX, lastY, lastZ);
          indexMap.set(lastKey, index);
          if (mesh && !needsRebuild.current) {
            setVoxelInstance(mesh, index, lastX, lastY, lastZ);
            updated = true;
          }
        }
        positions.length -= 3;
        frontierCount.current -= 1;
        indexMap.delete(key);
      }
      if (mesh && !needsRebuild.current && updated) {
        mesh.count = frontierCount.current;
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
    [setVoxelInstance],
  );

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
      }

      if (frame.delta.frontierReset) {
        frontierPositions.current = [];
        frontierIndex.current.clear();
        frontierCount.current = 0;
        resetVoxelEdits();
        if (meshRef.current) {
          meshRef.current.count = 0;
          if (meshRef.current.instanceMatrix) meshRef.current.instanceMatrix.needsUpdate = true;
          if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
      }

      if (frame.delta.frontierAdd && frame.delta.frontierAdd.length > 0) {
        if (frame.delta.frontierReset) {
          loadFrontierSnapshot(frame.delta.frontierAdd);
        } else {
          applyFrontierAdds(frame.delta.frontierAdd);
        }
      }

      if (
        !frame.delta.frontierReset &&
        frame.delta.frontierRemove &&
        frame.delta.frontierRemove.length > 0
      ) {
        applyFrontierRemoves(frame.delta.frontierRemove);
      }
    });
  }, [applyFrontierAdds, applyFrontierRemoves, bridge, loadFrontierSnapshot]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    if (needsRebuild.current) {
      rebuildMesh();
      needsRebuild.current = false;
    }
  }, [capacity, rebuildMesh]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} metalness={0.1} vertexColors />
      </instancedMesh>

      {/* Water Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, cfg.terrain.waterLevel, 0]} receiveShadow>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 20, cfg.terrain.worldRadius * 2 + 20]} />
        <meshStandardMaterial color="#42a7ff" transparent opacity={0.7} roughness={0.0} metalness={0.3} />
      </mesh>

      {/* Bedrock plane for world bounds */}
      <mesh position={[0, cfg.terrain.bedrockY ?? -50, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 10, cfg.terrain.worldRadius * 2 + 10]} />
        <meshStandardMaterial color="#333" roughness={1} />
      </mesh>
    </group>
  );
};
