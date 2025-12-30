import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { InstancedMesh } from "three";
import { Object3D } from "three";

import { applyInstanceUpdates } from "../../render/instanced";
import {
  ensureInstanceColors,
  getInitialCapacity,
  makeHeightColorFn,
  rebuildVoxelInstances,
  setVoxelInstance,
  type VoxelColorFn,
} from "./instancedVoxels/voxelInstanceMesh";
import {
  addVoxelToStore,
  clearVoxelStore,
  createVoxelInstanceStore,
  removeVoxelFromStore,
} from "./instancedVoxels/voxelInstanceStore";

export const useInstancedVoxels = (
  chunkSize: number,
  waterLevel: number,
  getColor?: VoxelColorFn,
) => {
  const meshRef = useRef<InstancedMesh>(null);
  const storeRef = useRef(createVoxelInstanceStore());
  const solidCountRef = useRef(0);
  const needsRebuild = useRef(false);
  const tmp = useMemo(() => new Object3D(), []);
  const getColorFn = useMemo(
    () => getColor ?? makeHeightColorFn(waterLevel),
    [getColor, waterLevel],
  );

  const UPDATE_BOTH = useMemo(() => ({ matrix: true, color: true }) as const, []);

  const [capacity, setCapacity] = useState(() => getInitialCapacity(chunkSize));
  const capacityRef = useRef(capacity);

  const ensureCapacity = useCallback((count: number) => {
    const currentCapacity = capacityRef.current;
    if (count <= currentCapacity) return;

    const nextCapacity = Math.max(count, Math.ceil(currentCapacity * 1.5));
    capacityRef.current = nextCapacity;
    needsRebuild.current = true;
    setCapacity(nextCapacity);
  }, []);

  const addVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const result = addVoxelToStore(storeRef.current, x, y, z);
      if (!result) return;
      solidCountRef.current = result.count;
      ensureCapacity(result.count);

      const mesh = meshRef.current;
      if (mesh && !needsRebuild.current) {
        setVoxelInstance(mesh, tmp, result.index, x, y, z, getColorFn);
        mesh.count = result.count;
        applyInstanceUpdates(mesh, UPDATE_BOTH);
      }
    },
    [UPDATE_BOTH, ensureCapacity, getColorFn, tmp],
  );

  const removeVoxel = useCallback(
    (x: number, y: number, z: number) => {
      const result = removeVoxelFromStore(storeRef.current, x, y, z);
      if (!result) return;
      solidCountRef.current = result.count;

      const mesh = meshRef.current;
      if (mesh && !needsRebuild.current) {
        if (result.moved) {
          setVoxelInstance(
            mesh,
            tmp,
            result.index,
            result.moved.x,
            result.moved.y,
            result.moved.z,
            getColorFn,
          );
        }
        mesh.count = result.count;
        applyInstanceUpdates(mesh, UPDATE_BOTH);
      }
    },
    [UPDATE_BOTH, getColorFn, tmp],
  );

  const clear = useCallback(() => {
    clearVoxelStore(storeRef.current);
    solidCountRef.current = 0;
    needsRebuild.current = false;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.count = 0;
      applyInstanceUpdates(mesh, UPDATE_BOTH);
    }
  }, [UPDATE_BOTH]);

  const flushRebuild = useCallback(() => {
    if (!needsRebuild.current) return;
    if (!meshRef.current) return;
    if (storeRef.current.count > capacityRef.current) return;
    rebuildVoxelInstances(meshRef.current, tmp, storeRef.current.positions, getColorFn);
    needsRebuild.current = false;
  }, [getColorFn, tmp]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    capacityRef.current = capacity;
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
