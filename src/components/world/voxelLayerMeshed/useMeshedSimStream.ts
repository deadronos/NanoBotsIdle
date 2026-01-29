import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

import { playerChunk, playerPosition } from "../../../engine/playerState";
import type { VoxelEdit } from "../../../shared/protocol";
import { applyVoxelEdits, resetVoxelEdits } from "../../../sim/collision";
import { getSurfaceHeightCore } from "../../../sim/terrain-core";
import type { SimBridge } from "../../../simBridge/simBridge";
import { forEachRadialChunk } from "../../../utils";
import { debug, groupCollapsed, groupEnd } from "../../../utils/logger";
import { chunkKey } from "../chunkHelpers";
import type { ChunkLoadConfig } from "../chunkLoadConfig";
import { countDenseSolidsInChunk } from "../renderDebugCompare";

type ChunkCoord3 = { cx: number; cy: number; cz: number };

type DebugCompareConfig = {
  enabled: boolean;
  logIntervalMs: number;
  radiusChunks: number;
};

export type MeshedDebugState = {
  meshChunkKeys: string[];
  processedChunkKeys: string[];
  emptyChunkKeys: string[];
  pendingResultCount: number;
  dirtyKeys: string[];
  inFlight: number;
};

export type MeshedChunkTrackingRefs = {
  activeChunks: MutableRefObject<Set<string>>;
  initialSurfaceChunkRef: MutableRefObject<ChunkCoord3 | null>;
  lastRequestedPlayerChunkRef: MutableRefObject<ChunkCoord3 | null>;
};

export const useMeshedSimStream = (args: {
  bridge: SimBridge;
  tracking: MeshedChunkTrackingRefs;

  chunkSize: number;
  prestigeLevel: number;
  seed: number;
  spawnX: number;
  spawnZ: number;

  terrain: {
    surfaceBias: number;
    quantizeScale: number;
  };

  chunkLoadConfig: ChunkLoadConfig;

  ensureChunk: (cx: number, cy: number, cz: number) => void;
  setFocusChunk: (cx: number, cy: number, cz: number) => void;
  reset: () => void;
  markDirtyForEdits: (edits: VoxelEdit[]) => void;
  getDebugState: () => MeshedDebugState;

  debugCompare: DebugCompareConfig;
}) => {
  const {
    bridge,
    tracking,
    chunkSize,
    prestigeLevel,
    seed,
    spawnX,
    spawnZ,
    terrain,
    chunkLoadConfig,
    ensureChunk,
    setFocusChunk,
    reset,
    markDirtyForEdits,
    getDebugState,
    debugCompare,
  } = args;

  const debugLastLogAtMsRef = useRef(0);

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (tracking.activeChunks.current.has(key)) return;
      tracking.activeChunks.current.add(key);
      ensureChunk(cx, cy, cz);
    },
    [ensureChunk, tracking.activeChunks],
  );

  const ensureInitialChunk = useCallback(() => {
    if (tracking.activeChunks.current.size > 0) return;

    const surfaceY = getSurfaceHeightCore(
      spawnX,
      spawnZ,
      seed,
      terrain.surfaceBias,
      terrain.quantizeScale,
    );
    const cy = Math.floor(surfaceY / chunkSize);
    const baseCx = Math.floor(spawnX / chunkSize);
    const baseCz = Math.floor(spawnZ / chunkSize);

    tracking.initialSurfaceChunkRef.current = { cx: baseCx, cy, cz: baseCz };
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
    seed,
    setFocusChunk,
    spawnX,
    spawnZ,
    terrain.quantizeScale,
    terrain.surfaceBias,
    tracking.activeChunks,
    tracking.initialSurfaceChunkRef,
  ]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.frontierReset) {
        tracking.activeChunks.current.clear();
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

      const lastReq = tracking.lastRequestedPlayerChunkRef.current;
      const shouldRequest =
        !lastReq || lastReq.cx !== pcx || lastReq.cy !== pcy || lastReq.cz !== pcz;
      if (shouldRequest) {
        tracking.lastRequestedPlayerChunkRef.current = { cx: pcx, cy: pcy, cz: pcz };
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

      if (debugCompare.enabled) {
        const now = performance.now();
        if (now - debugLastLogAtMsRef.current >= debugCompare.logIntervalMs) {
          debugLastLogAtMsRef.current = now;

          const radius = debugCompare.radiusChunks;
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
          const missingNotRequested = missingMeshes.filter(
            (k) => !tracking.activeChunks.current.has(k),
          );
          const missingRequestedPending = missingMeshes.filter(
            (k) => tracking.activeChunks.current.has(k) && !processedKeySet.has(k),
          );
          const missingRequestedEmpty = missingMeshes.filter(
            (k) => tracking.activeChunks.current.has(k) && emptyKeySet.has(k),
          );

          const requestedChunkCount = expectedChunkKeys.filter((k) =>
            tracking.activeChunks.current.has(k),
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
              surfaceChunk: tracking.initialSurfaceChunkRef.current,
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
    chunkLoadConfig.activeDims,
    chunkLoadConfig.activeRadius,
    chunkSize,
    debugCompare.enabled,
    debugCompare.logIntervalMs,
    debugCompare.radiusChunks,
    ensureInitialChunk,
    getDebugState,
    markDirtyForEdits,
    prestigeLevel,
    reset,
    setFocusChunk,
    tracking.activeChunks,
    tracking.initialSurfaceChunkRef,
    tracking.lastRequestedPlayerChunkRef,
  ]);
};
