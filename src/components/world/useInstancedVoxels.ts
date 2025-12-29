import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { InstancedMesh } from "three";
import { Object3D } from "three";

import {
  ensureInstanceColors,
  getInitialCapacity,
  rebuildVoxelInstances,
  setVoxelInstance,
} from "./instancedVoxels/voxelInstanceMesh";
import {
  addVoxelToStore,
  clearVoxelStore,
  createVoxelInstanceStore,
  removeVoxelFromStore,
} from "./instancedVoxels/voxelInstanceStore";

export const useInstancedVoxels = (chunkSize: number) => {
  const meshRef = useRef<InstancedMesh>(null);
  const storeRef = useRef(createVoxelInstanceStore());
  const solidCountRef = useRef(0);
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

  const addVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const result = addVoxelToStore(storeRef.current, x, y, z);
      if (!result) return;
      solidCountRef.current = result.count;
      ensureCapacity(result.count);

      const mesh = meshRef.current;
      if (mesh && !needsRebuild.current) {
        setVoxelInstance(mesh, tmp, result.index, x, y, z);
        mesh.count = result.count;
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
    [ensureCapacity, tmp],
  );

  const removeVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const result = removeVoxelFromStore(storeRef.current, x, y, z);
      if (!result) return;
      solidCountRef.current = result.count;

      const mesh = meshRef.current;
      if (mesh && !needsRebuild.current) {
        if (result.moved) {
          setVoxelInstance(mesh, tmp, result.index, result.moved.x, result.moved.y, result.moved.z);
        }
        mesh.count = result.count;
        if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
    [tmp],
  );

  const clear = useCallback(() => {
    clearVoxelStore(storeRef.current);
    solidCountRef.current = 0;
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
    if (storeRef.current.count > capacity) return;
    rebuildVoxelInstances(meshRef.current, tmp, storeRef.current.positions);
    needsRebuild.current = false;
  }, [capacity, tmp]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (ensureInstanceColors(mesh, capacity)) {
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
    solidCountRef,
  };
};
