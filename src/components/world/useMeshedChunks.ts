import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { MeshStandardMaterial } from "three";

import { getConfig } from "../../config";
import { getDirtyChunksForVoxelEdit } from "../../meshing/dirtyChunks";
import type { MeshingScheduler } from "../../meshing/meshingScheduler";
import { createMeshingScheduler } from "../../meshing/schedulerFactory";
import type { VoxelEdit } from "../../shared/protocol";
import { chunkDistanceSq3 } from "../../utils";
import { chunkKey } from "./chunkHelpers";
import { MeshManager } from "./mesh/MeshManager";

export const useMeshedChunks = (options: {
  isResident?: (key: string) => boolean;
  chunkSize: number;
  prestigeLevel: number;
  waterLevel: number;
  seed?: number;
  onSchedulerChange?: () => void;
  isChunkVisible?: (coord: { cx: number; cy: number; cz: number }) => boolean;
}) => {
  const {
    chunkSize,
    prestigeLevel,
    waterLevel,
    seed,
    onSchedulerChange,
    isChunkVisible,
    isResident,
  } = options;

  const focusChunkRef = useRef<{ cx: number; cy: number; cz: number }>({ cx: 0, cy: 0, cz: 0 });
  const reprioritizeTimeoutRef = useRef<number | null>(null);

  const groupRef = useRef<Group>(null);
  const schedulerRef = useRef<MeshingScheduler | null>(null);
  const visibilityProvider = useRef(isChunkVisible);

  useEffect(() => {
    visibilityProvider.current = isChunkVisible;
    schedulerRef.current?.reprioritizeDirty();
  }, [isChunkVisible]);

  const material = useMemo(() => {
    const material = new MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.05,
      vertexColors: true,
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `varying vec3 vTerrainPosition;
${shader.vertexShader}`.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vTerrainPosition = position;`,
      );
      shader.fragmentShader = `varying vec3 vTerrainPosition;
${shader.fragmentShader}`.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
          vec3 voxel = floor(vTerrainPosition + 0.001);
          float grain = fract(sin(dot(voxel, vec3(17.31, 59.72, 91.63))) * 14375.47);
          diffuseColor.rgb *= mix(0.94, 1.06, grain);`,
      );
    };
    return material;
  }, []);

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
      isChunkVisible: (coord) => visibilityProvider.current?.(coord) ?? false,
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
  }, [chunkSize, meshManager, onSchedulerChange, prestigeLevel, seed, waterLevel]);

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

  const retryDroppedChunks = useCallback(() => schedulerRef.current?.retryDroppedChunks(), []);

  const removeChunk = useCallback(
    (key: string) => {
      schedulerRef.current?.forgetChunk(key);
      meshManager.removeChunk(key);
    },
    [meshManager],
  );

  const hasChunkWork = useCallback(
    (key: string) => meshManager.hasChunk(key) || !!schedulerRef.current?.hasPendingChunk(key),
    [meshManager],
  );

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
          includeCorners: true,
        });
        scheduler.markDirtyMany(
          isResident ? dirty.filter(({ cx, cy, cz }) => isResident(chunkKey(cx, cy, cz))) : dirty,
        );
      }
      scheduler.pump();
    },
    [chunkSize, isResident],
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
      inFlightKeys: scheduler?.getInFlightKeys() ?? [],
      failedKeys: scheduler?.getFailedKeys() ?? [],
      inFlight: scheduler?.getInFlightCount() ?? 0,
    };
  }, [meshManager]);

  return {
    groupRef,
    ensureChunk,
    removeChunk,
    retryDroppedChunks,
    hasChunkWork,
    markDirtyForEdits,
    setFocusChunk,
    getDebugState,
    reset,
  };
};
