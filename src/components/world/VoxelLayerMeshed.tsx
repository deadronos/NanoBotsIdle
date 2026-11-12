import { useThree } from "@react-three/fiber";
import React, { useCallback, useMemo, useRef } from "react";

import { useConfig } from "../../config/useConfig";
import { applyLodGeometry } from "../../render/lodGeometry";
import { createLodThresholds, isChunkVisible as isChunkVisibleFn } from "../../render/lodUtils";
import { defaultOcclusionConfig } from "../../render/occlusionCuller";
import { getMeshedTerrainFogEnd } from "../../render/terrainFog";
import { getSimBridge } from "../../simBridge/simBridge";
import { normalizeChunkLoadConfig } from "./chunkLoadConfig";
import { useMeshedChunks } from "./useMeshedChunks";
import { useMeshedSimStream } from "./voxelLayerMeshed/useMeshedSimStream";
import { useMeshedVisibilityPass } from "./voxelLayerMeshed/useMeshedVisibilityPass";
import { useOcclusionCuller } from "./voxelLayerMeshed/useOcclusionCuller";

export const VoxelLayerMeshed: React.FC<{
  chunkSize: number;
  prestigeLevel: number;
  spawnX: number;
  spawnZ: number;
  seed: number;
}> = ({ chunkSize, prestigeLevel, seed, spawnX, spawnZ }) => {
  const activeChunks = useRef<Set<string>>(new Set());
  const initialSurfaceChunkRef = useRef<{ cx: number; cy: number; cz: number } | null>(null);
  const lastRequestedPlayerChunkRef = useRef<{ cx: number; cy: number; cz: number } | null>(null);
  const cfg = useConfig();
  const bridge = getSimBridge();
  const { camera, gl } = useThree();

  const { lowDistanceMultiplier, hideDistanceMultiplier } = cfg.render.voxels.lod;
  const lodThresholds = useMemo(
    () =>
      createLodThresholds(chunkSize, {
        lowDistanceMultiplier,
        hideDistanceMultiplier,
      }),
    [chunkSize, lowDistanceMultiplier, hideDistanceMultiplier],
  );

  const chunkLoadConfig = useMemo(
    () => normalizeChunkLoadConfig(cfg.render.voxels.chunkLoad),
    [cfg.render.voxels.chunkLoad],
  );

  const occlusionConfig = useMemo(
    () => ({ ...defaultOcclusionConfig, ...(cfg.render.voxels.occlusion ?? {}) }),
    [cfg.render.voxels.occlusion],
  );

  const occlusionRef = useOcclusionCuller(gl, occlusionConfig);

  const handleSchedulerChange = useCallback(() => {
    // Clear activeChunks when scheduler is recreated (e.g., when actualSeed arrives)
    activeChunks.current.clear();
    initialSurfaceChunkRef.current = null;
    lastRequestedPlayerChunkRef.current = null;
  }, []);

  const isChunkVisible = useCallback(
    (coord: { cx: number; cy: number; cz: number }) =>
      isChunkVisibleFn(coord, chunkSize, camera, lodThresholds),
    [chunkSize, camera, lodThresholds],
  );

  const isResident = useCallback((key: string) => activeChunks.current.has(key), []);
  const {
    ensureChunk,
    removeChunk,
    retryDroppedChunks,
    hasChunkWork,
    getDebugState,
    groupRef,
    markDirtyForEdits,
    reset,
    setFocusChunk,
  } = useMeshedChunks({
    chunkSize,
    isResident,
    prestigeLevel,
    waterLevel: cfg.terrain.waterLevel,
    seed,
    onSchedulerChange: handleSchedulerChange,
    isChunkVisible,
  });

  useMeshedSimStream({
    bridge,
    camera,
    tracking: {
      activeChunks,
      initialSurfaceChunkRef,
      lastRequestedPlayerChunkRef,
    },
    chunkSize,
    prestigeLevel,
    seed,
    spawnX,
    spawnZ,
    terrain: {
      surfaceBias: cfg.terrain.surfaceBias,
      quantizeScale: cfg.terrain.quantizeScale,
    },
    chunkLoadConfig,
    ensureChunk,
    removeChunk,
    retryDroppedChunks,
    hasChunkWork,
    setFocusChunk,
    reset,
    markDirtyForEdits,
    getDebugState,
    debugCompare: cfg.render.voxels.debugCompare,
  });

  const lodVisibilityOptions = useMemo(
    () => ({
      onLodChange: applyLodGeometry,
      fogEnd: getMeshedTerrainFogEnd(chunkSize),
      progressive: cfg.render.voxels.lod.progressive,
    }),
    [cfg.render.voxels.lod.progressive, chunkSize],
  );

  useMeshedVisibilityPass({
    groupRef,
    camera,
    lodThresholds,
    lodVisibilityOptions,
    occlusionRef,
    occlusionConfig,
  });

  return <group ref={groupRef} />;
};
