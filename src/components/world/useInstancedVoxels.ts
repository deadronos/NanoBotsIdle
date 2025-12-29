import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { InstancedMesh } from "three";
import { InstancedBufferAttribute, Object3D } from "three";

import { ensureGeometryHasVertexColors } from "../../render/instanced";
import { voxelKey } from "../../shared/voxel";
import { getVoxelColor } from "../../utils";

const getInitialCapacity = (chunkSize: number) => {
  return Math.max(512, chunkSize * chunkSize * chunkSize);
};

export const useInstancedVoxels = (chunkSize: number) => {
  const meshRef = useRef<InstancedMesh>(null);
  const solidPositions = useRef<number[]>([]);
  const solidIndex = useRef<Map<string, number>>(new Map());
  const solidCount = useRef(0);
  const needsRebuild = useRef(false);
  const tmp = useMemo(() => new Object3D(), []);

  const [capacity, setCapacity] = useState(() => getInitialCapacity(chunkSize));

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
    const positions = solidPositions.current;
    const count = positions.length / 3;
    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      setVoxelInstance(mesh, i, positions[base], positions[base + 1], positions[base + 2]);
    }
    mesh.count = count;
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [setVoxelInstance]);

  const addVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const key = voxelKey(x, y, z);
      if (solidIndex.current.has(key)) return;
      const index = solidCount.current;
      solidIndex.current.set(key, index);
      solidPositions.current.push(x, y, z);
      solidCount.current += 1;
      ensureCapacity(solidCount.current);

      const mesh = meshRef.current;
      if (mesh && !needsRebuild.current) {
        setVoxelInstance(mesh, index, x, y, z);
        mesh.count = solidCount.current;
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
    [ensureCapacity, setVoxelInstance],
  );

  const removeVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const key = voxelKey(x, y, z);
      const index = solidIndex.current.get(key);
      if (index === undefined) return;

      const lastIndex = solidCount.current - 1;
      const positions = solidPositions.current;
      if (index !== lastIndex) {
        const lastBase = lastIndex * 3;
        const lastX = positions[lastBase];
        const lastY = positions[lastBase + 1];
        const lastZ = positions[lastBase + 2];
        positions[index * 3] = lastX;
        positions[index * 3 + 1] = lastY;
        positions[index * 3 + 2] = lastZ;
        const lastKey = voxelKey(lastX, lastY, lastZ);
        solidIndex.current.set(lastKey, index);
        const mesh = meshRef.current;
        if (mesh && !needsRebuild.current) {
          setVoxelInstance(mesh, index, lastX, lastY, lastZ);
        }
      }

      positions.length -= 3;
      solidCount.current -= 1;
      solidIndex.current.delete(key);

      const mesh = meshRef.current;
      if (mesh && !needsRebuild.current) {
        mesh.count = solidCount.current;
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
    [setVoxelInstance],
  );

  const clear = useCallback(() => {
    solidPositions.current = [];
    solidIndex.current.clear();
    solidCount.current = 0;
    needsRebuild.current = false;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.count = 0;
      if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, []);

  const flushRebuild = useCallback(() => {
    if (!needsRebuild.current) return;
    if (!meshRef.current) return;
    if (solidCount.current > capacity) return;
    rebuildMesh();
    needsRebuild.current = false;
  }, [capacity, rebuildMesh]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    ensureGeometryHasVertexColors(mesh.geometry);
    if (!mesh.instanceColor || mesh.instanceColor.count !== capacity) {
      const colors = new Float32Array(capacity * 3);
      colors.fill(1);
      mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
      mesh.geometry.setAttribute("instanceColor", mesh.instanceColor);
      mesh.instanceColor.needsUpdate = true;
      needsRebuild.current = true;
    }

    flushRebuild();
  }, [capacity, flushRebuild]);

  return {
    meshRef,
    capacity,
    ensureCapacity,
    addVoxel,
    removeVoxel,
    clear,
    flushRebuild,
    solidCountRef: solidCount,
  };
};
