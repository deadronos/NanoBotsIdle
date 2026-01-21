import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { MeshStandardMaterial } from "three";

import { getConfig } from "../../config";
import { getDirtyChunksForVoxelEdit } from "../../meshing/dirtyChunks";
import type { MeshingScheduler } from "../../meshing/meshingScheduler";
import { createMeshingScheduler } from "../../meshing/schedulerFactory";
import type { VoxelEdit } from "../../shared/protocol";
import { chunkDistanceSq3 } from "../../utils";
import { MeshManager } from "./mesh/MeshManager";

export const useMeshedChunks = (options: {
  chunkSize: number;
  prestigeLevel: number;
  waterLevel: number;
  seed?: number;
  onSchedulerChange?: () => void;
  isChunkVisible?: (coord: { cx: number; cy: number; cz: number }) => boolean;
}) => {
  const { chunkSize, prestigeLevel, waterLevel, seed, onSchedulerChange, isChunkVisible } = options;

  const focusChunkRef = useRef<{ cx: number; cy: number; cz: number }>({ cx: 0, cy: 0, cz: 0 });
  const reprioritizeTimeoutRef = useRef<number | null>(null);

  const groupRef = useRef<Group>(null);
  const schedulerRef = useRef<MeshingScheduler | null>(null);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        roughness: 0.85,
        metalness: 0.05,
        vertexColors: true,
      }),
    [],
  );

  const meshManager = useMemo(() => new MeshManager(material), [material]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const config = getConfig();
      meshManager.setGroup(groupRef.current);
      meshManager.processQueue(config.meshing.maxMeshesPerFrame, waterLevel);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [meshManager, waterLevel]);

  useEffect(() => {
    const config = getConfig();

    const priorityFromFocus = (coord: { cx: number; cy: number; cz: number }) => {
      return chunkDistanceSq3(coord, focusChunkRef.current);
    };

    const scheduler = createMeshingScheduler({
      chunkSize,
      prestigeLevel,
      waterLevel,
      seed,
      isChunkVisible,
      onApply: (res) => meshManager.queueResult(res),
      getPriority: priorityFromFocus,
      maxInFlight: config.meshing.maxInFlight,
      maxQueueSize: config.meshing.maxQueueSize,
    });

    schedulerRef.current = scheduler;
    // Notify parent that scheduler was (re)created so it can re-sync its chunk tracking
    onSchedulerChange?.();
    return () => {
      // Clear any pending reprioritization timeout
      if (reprioritizeTimeoutRef.current !== null) {
        clearTimeout(reprioritizeTimeoutRef.current);
        reprioritizeTimeoutRef.current = null;
      }
      schedulerRef.current = null;
      scheduler.dispose();
      meshManager.disposeAll();
    };
  }, [chunkSize, isChunkVisible, meshManager, onSchedulerChange, prestigeLevel, seed, waterLevel]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const ensureChunk = useCallback((cx: number, cy: number, cz: number) => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    scheduler.markDirty({ cx, cy, cz });
    scheduler.pump();
  }, []);

  const markDirtyForEdits = useCallback(
    (edits: VoxelEdit[]) => {
      const scheduler = schedulerRef.current;
      if (!scheduler) return;
      for (const edit of edits) {
        const dirty = getDirtyChunksForVoxelEdit({
          x: edit.x,
          y: edit.y,
          z: edit.z,
          chunkSize,
        });
        scheduler.markDirtyMany(dirty);
      }
      scheduler.pump();
    },
    [chunkSize],
  );

  const reset = useCallback(() => {
    schedulerRef.current?.clearAll();
    meshManager.disposeAll();
  }, [meshManager]);

  const setFocusChunk = useCallback((cx: number, cy: number, cz: number) => {
    focusChunkRef.current = { cx, cy, cz };
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    // Debounce reprioritization to avoid expensive heap rebuilds on every frame when player moves.
    // Update focus immediately but defer the actual reprioritization for 150ms.
    if (reprioritizeTimeoutRef.current !== null) {
      clearTimeout(reprioritizeTimeoutRef.current);
    }

    reprioritizeTimeoutRef.current = window.setTimeout(() => {
      reprioritizeTimeoutRef.current = null;
      const currentScheduler = schedulerRef.current;
      if (currentScheduler) {
        currentScheduler.reprioritizeDirty();
        currentScheduler.pump();
      }
    }, 150);

    // Always pump immediately to process any pending chunks, even without reprioritization
    scheduler.pump();
  }, []);

  const getDebugState = useCallback(() => {
    const scheduler = schedulerRef.current;
    const meshState = meshManager.getDebugState();
    return {
      ...meshState,
      dirtyKeys: scheduler?.getDirtyKeys() ?? [],
      inFlight: scheduler?.getInFlightCount() ?? 0,
    };
  }, [meshManager]);

  return {
    groupRef,
    ensureChunk,
    markDirtyForEdits,
    setFocusChunk,
    getDebugState,
    reset,
  };
};
