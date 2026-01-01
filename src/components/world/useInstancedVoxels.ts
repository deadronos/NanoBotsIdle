import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { InstancedMesh } from "three";
import { Object3D } from "three";

import { error } from "@/utils/logger";

import { applyInstanceUpdates } from "../../render/instanced";
import { InstanceRebuildManager } from "./instancedVoxels/rebuildManager";
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
  const pendingRebuild = useRef(false);
  const tmp = useMemo(() => new Object3D(), []);
  const getColorFn = useMemo(
    () => getColor ?? makeHeightColorFn(waterLevel),
    [getColor, waterLevel],
  );

  // Create rebuild manager once
  const rebuildManager = useMemo(() => new InstanceRebuildManager(), []);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      rebuildManager.terminate();
    };
  }, [rebuildManager]);

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
        applyInstanceUpdates(mesh, {
          matrixRange: { start: result.index, end: result.index },
          colorRange: { start: result.index, end: result.index },
        });
      }
    },
    [ensureCapacity, getColorFn, tmp],
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
        applyInstanceUpdates(mesh, {
          matrixRange: { start: result.index, end: result.index },
          colorRange: { start: result.index, end: result.index },
        });
      }
    },
    [getColorFn, tmp],
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

  const flushRebuild = useCallback(async () => {
    if (!needsRebuild.current) return;
    if (!meshRef.current) return;
    if (storeRef.current.count > capacityRef.current) return;
    if (pendingRebuild.current) return; // Don't start a new rebuild if one is in progress

    const mesh = meshRef.current;
    const store = storeRef.current;
    const count = store.count;
    const positions = store.positions.subarray(0, count * 3);

    // Threshold for using worker: use worker for larger rebuilds (e.g., > 100 instances)
    const WORKER_THRESHOLD = 100;

    if (count > WORKER_THRESHOLD) {
      // Use worker for large rebuilds to avoid main-thread hitches
      pendingRebuild.current = true;

      try {
        const result = await rebuildManager.requestRebuild(positions, waterLevel);
        // Apply the result atomically in one frame (double-buffering)
        rebuildManager.applyRebuildToMesh(mesh, result.matrices, result.colors, result.count);
        needsRebuild.current = false;
      } catch (err) {
        // Fallback to main-thread rebuild on error
        error("Instance rebuild worker failed:", err);
        rebuildVoxelInstances(mesh, tmp, positions, getColorFn);
        needsRebuild.current = false;
      } finally {
        pendingRebuild.current = false;
      }
    } else {
      // For small rebuilds, use main-thread to avoid worker overhead
      rebuildVoxelInstances(mesh, tmp, positions, getColorFn);
      needsRebuild.current = false;
    }
  }, [getColorFn, tmp, waterLevel, rebuildManager]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    capacityRef.current = capacity;
    if (ensureInstanceColors(mesh, capacity)) {
      needsRebuild.current = true;
    }

    // Call async flushRebuild without awaiting in useLayoutEffect
    void flushRebuild();
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
