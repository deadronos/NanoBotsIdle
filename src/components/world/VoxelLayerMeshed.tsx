import { useThree } from "@react-three/fiber";
import React, { useCallback, useMemo, useRef } from "react";

import { useConfig } from "../../config/useConfig";
import { applyLodGeometry } from "../../render/lodGeometry";
import {
  createLodThresholds,
  isChunkVisible as isChunkVisibleFn,
} from "../../render/lodUtils";
import { defaultOcclusionConfig } from "../../render/occlusionCuller";
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

  const lodThresholds = useMemo(() => createLodThresholds(chunkSize), [chunkSize]);

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

  const { ensureChunk, getDebugState, groupRef, markDirtyForEdits, reset, setFocusChunk } =
    useMeshedChunks({
      chunkSize,
      prestigeLevel,
      waterLevel: cfg.terrain.waterLevel,
      seed,
      onSchedulerChange: handleSchedulerChange,
      isChunkVisible: (coord: { cx: number; cy: number; cz: number }) =>
        isChunkVisibleFn(coord, chunkSize, camera, lodThresholds),
    });

  useMeshedSimStream({
    bridge,
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
    setFocusChunk,
    reset,
    markDirtyForEdits,
    getDebugState,
    debugCompare: cfg.render.voxels.debugCompare,
  });

  const lodVisibilityOptions = useMemo(
    () => ({
      onLodChange: applyLodGeometry,
      progressive: cfg.render.voxels.lod.progressive,
    }),
    [cfg.render.voxels.lod.progressive],
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
