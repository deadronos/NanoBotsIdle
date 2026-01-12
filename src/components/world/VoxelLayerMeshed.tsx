import { useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Quaternion, Vector3 } from "three";

import { useConfig } from "../../config/useConfig";
import { playerChunk, playerPosition } from "../../engine/playerState";
import { applyLodGeometry } from "../../render/lodGeometry";
import { applyChunkVisibility, createLodThresholds, isChunkVisible as isChunkVisibleFn } from "../../render/lodUtils";
import { applyOcclusionVisibility, createOcclusionCuller, defaultOcclusionConfig } from "../../render/occlusionCuller";
import { applyVoxelEdits, resetVoxelEdits } from "../../sim/collision";
import { getSurfaceHeightCore } from "../../sim/terrain-core";
import { getSimBridge } from "../../simBridge/simBridge";
import { forEachRadialChunk } from "../../utils";
import { debug, groupCollapsed, groupEnd } from "../../utils/logger";
import { chunkKey } from "./chunkHelpers";
import { normalizeChunkLoadConfig } from "./chunkLoadConfig";
import { countDenseSolidsInChunk } from "./renderDebugCompare";
import { useMeshedChunks } from "./useMeshedChunks";

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

  const occlusionRef = useRef<ReturnType<typeof createOcclusionCuller> | null>(null);

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

  const debugCfg = cfg.render.voxels.debugCompare;
  const debugEnabled = debugCfg.enabled;
  const debugLastLogAtMsRef = useRef(0);

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (activeChunks.current.has(key)) return;
      activeChunks.current.add(key);
      ensureChunk(cx, cy, cz);
    },
    [ensureChunk],
  );

  const ensureInitialChunk = useCallback(() => {
    if (activeChunks.current.size > 0) return;
    const surfaceY = getSurfaceHeightCore(
      spawnX,
      spawnZ,
      seed,
      cfg.terrain.surfaceBias,
      cfg.terrain.quantizeScale,
    );
    const cy = Math.floor(surfaceY / chunkSize);
    const baseCx = Math.floor(spawnX / chunkSize);
    const baseCz = Math.floor(spawnZ / chunkSize);
    initialSurfaceChunkRef.current = { cx: baseCx, cy, cz: baseCz };
    setFocusChunk(baseCx, cy, baseCz);
    forEachRadialChunk(
      { cx: baseCx, cy, cz: baseCz },
      chunkLoadConfig.initialRadius,
      chunkLoadConfig.initialDims,
      (c) => {
        addChunk(c.cx, c.cy, c.cz);
      },
    );
  }, [
    addChunk,
    chunkLoadConfig.initialDims,
    chunkLoadConfig.initialRadius,
    chunkSize,
    cfg.terrain.quantizeScale,
    cfg.terrain.surfaceBias,
    seed,
    setFocusChunk,
    spawnX,
    spawnZ,
  ]);

  useEffect(() => {
    const culler = createOcclusionCuller(gl, occlusionConfig);
    occlusionRef.current = culler;
    return () => {
      culler.dispose();
      occlusionRef.current = null;
    };
  }, [
    gl,
    occlusionConfig,
  ]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.frontierReset) {
        activeChunks.current.clear();
        reset();
        resetVoxelEdits();
      }

      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
        markDirtyForEdits(frame.delta.edits);
      }

      ensureInitialChunk();

      // Poll player chunk
      const px = playerPosition.x;
      const py = playerPosition.y;
      const pz = playerPosition.z;
      const pcx = Math.floor(px / chunkSize);
      const pcy = Math.floor(py / chunkSize);
      const pcz = Math.floor(pz / chunkSize);

      const lastReq = lastRequestedPlayerChunkRef.current;
      const shouldRequest =
        !lastReq || lastReq.cx !== pcx || lastReq.cy !== pcy || lastReq.cz !== pcz;
      if (shouldRequest) {
        lastRequestedPlayerChunkRef.current = { cx: pcx, cy: pcy, cz: pcz };
        playerChunk.cx = pcx;
        playerChunk.cy = pcy;
        playerChunk.cz = pcz;
        setFocusChunk(pcx, pcy, pcz);
        // Ensure the same 3D neighborhood we debug/expect is actually requested.
        forEachRadialChunk(
          { cx: pcx, cy: pcy, cz: pcz },
          chunkLoadConfig.activeRadius,
          chunkLoadConfig.activeDims,
          (c) => {
            addChunk(c.cx, c.cy, c.cz);
          },
        );
      }

      if (debugEnabled) {
        const now = performance.now();
        if (now - debugLastLogAtMsRef.current >= debugCfg.logIntervalMs) {
          debugLastLogAtMsRef.current = now;

          const radius = debugCfg.radiusChunks;
          const expectedChunkKeys: string[] = [];
          forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, radius, 3, (c) => {
            expectedChunkKeys.push(chunkKey(c.cx, c.cy, c.cz));
          });

          let denseSolids = 0;
          forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, radius, 3, (c) => {
            denseSolids += countDenseSolidsInChunk({
              cx: c.cx,
              cy: c.cy,
              cz: c.cz,
              chunkSize,
              prestigeLevel,
            });
          });

          const dbg = getDebugState();
          const meshKeySet = new Set(dbg.meshChunkKeys);
          const processedKeySet = new Set(dbg.processedChunkKeys);
          const emptyKeySet = new Set(dbg.emptyChunkKeys);

          const missingMeshes = expectedChunkKeys.filter((k) => !meshKeySet.has(k));
          const missingNotRequested = missingMeshes.filter((k) => !activeChunks.current.has(k));
          const missingRequestedPending = missingMeshes.filter(
            (k) => activeChunks.current.has(k) && !processedKeySet.has(k),
          );
          const missingRequestedEmpty = missingMeshes.filter(
            (k) => activeChunks.current.has(k) && emptyKeySet.has(k),
          );

          const requestedChunkCount = expectedChunkKeys.filter((k) =>
            activeChunks.current.has(k),
          ).length;

          // Only emit verbose render-debug output in development to avoid noisy production logs
          if (process.env.NODE_ENV === "development") {
            groupCollapsed(
              `[render-debug] meshed pc=(${pcx},${pcy},${pcz}) radius=${radius} chunksize=${chunkSize}`,
            );
            debug({
              denseBaselineSolidCount: denseSolids,
              expectedChunkCount: expectedChunkKeys.length,
              requestedChunkCount,
              meshedMeshChunkCount: dbg.meshChunkKeys.length,
              meshedProcessedChunkCount: dbg.processedChunkKeys.length,
              meshedEmptyChunkCount: dbg.emptyChunkKeys.length,
              meshingDirtyCount: dbg.dirtyKeys.length,
              meshingInFlight: dbg.inFlight,
              surfaceChunk: initialSurfaceChunkRef.current,
              missingNotRequested: missingNotRequested.slice(0, 20),
              missingNotRequestedCount: missingNotRequested.length,
              missingRequestedPending: missingRequestedPending.slice(0, 20),
              missingRequestedPendingCount: missingRequestedPending.length,
              missingRequestedEmpty: missingRequestedEmpty.slice(0, 20),
              missingRequestedEmptyCount: missingRequestedEmpty.length,
            });
            groupEnd();
          }
        }
      }
    });
  }, [
    addChunk,
    bridge,
    chunkSize,
    debugCfg.logIntervalMs,
    debugCfg.radiusChunks,
    debugEnabled,
    ensureInitialChunk,
    getDebugState,
    chunkLoadConfig.activeDims,
    chunkLoadConfig.activeRadius,
    markDirtyForEdits,
    prestigeLevel,
    reset,
    setFocusChunk,
  ]);

  const lodVisibilityOptions = useMemo(
    () => ({
      onLodChange: applyLodGeometry,
      progressive: cfg.render.voxels.lod.progressive,
    }),
    [cfg.render.voxels.lod.progressive],
  );

  // Camera movement sampling to avoid expensive per-frame visibility passes
  const lastCameraPosRef = useRef(new Vector3());
  const lastCameraQuatRef = useRef(new Quaternion());
  const frameCounterRef = useRef(0);

  // Throttle visibility and occlusion work to avoid long frame handlers.
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    // Only recompute visibility when the camera has moved/rotated significantly
    // or periodically as a fallback to handle other dynamic changes.
    // This reduces work during stationary cameras and avoids expensive per-frame loops.
    const camPos = camera.position;
    const camQuat = camera.quaternion;

    // Reused refs to avoid allocations
    const lastPos = lastCameraPosRef.current;
    const lastQuat = lastCameraQuatRef.current;

    const moved = camPos.distanceToSquared(lastPos) > 0.01; // ~> 0.1 units
    const rotated = Math.abs(camQuat.dot(lastQuat) - 1) > 1e-6;

    frameCounterRef.current = (frameCounterRef.current + 1) % 30; // fallback every 30 frames (~0.5s at 60fps)
    const periodic = frameCounterRef.current === 0;

    if (!moved && !rotated && !periodic) return;

    // Update last camera samples
    lastPos.copy(camPos);
    lastQuat.copy(camQuat);

    applyChunkVisibility(group.children, camera, lodThresholds, lodVisibilityOptions);

    const occlusion = occlusionRef.current;
    if (occlusionConfig.enabled && occlusion?.isSupported) {
      occlusion.update(group.children, camera);
      applyOcclusionVisibility(group.children);
    }
  });

  return <group ref={groupRef} />;
};
