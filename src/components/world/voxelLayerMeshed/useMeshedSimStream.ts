import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { type Camera, Vector3 } from "three";

import { playerChunk, playerPosition } from "../../../engine/playerState";
import type { VoxelEdit } from "../../../shared/protocol";
import { applyVoxelEdits, resetVoxelEdits } from "../../../sim/collision";
import { getSurfaceHeightCore } from "../../../sim/terrain-core";
import type { SimBridge } from "../../../simBridge/simBridge";
import { useUiStore } from "../../../ui/store";
import { forEachRadialChunk } from "../../../utils";
import { debug, groupCollapsed, groupEnd } from "../../../utils/logger";
import { chunkKey } from "../chunkHelpers";
import type { ChunkLoadConfig } from "../chunkLoadConfig";
import { countDenseSolidsInChunk } from "../renderDebugCompare";
import { forEachForwardChunkColumn } from "./forwardChunkColumns";

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
  pendingResultKeys: string[];
  pendingResultCount: number;
  dirtyKeys: string[];
  inFlightKeys: string[];
  failedKeys: string[];
  inFlight: number;
};

export type MeshedChunkTrackingRefs = {
  activeChunks: MutableRefObject<Set<string>>;
  initialSurfaceChunkRef: MutableRefObject<ChunkCoord3 | null>;
  lastRequestedPlayerChunkRef: MutableRefObject<ChunkCoord3 | null>;
};

export const useMeshedSimStream = (args: {
  bridge: SimBridge;
  camera: Camera;
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
  removeChunk: (key: string) => void;
  retryDroppedChunks: () => void;
  hasChunkWork: (key: string) => boolean;
  setFocusChunk: (cx: number, cy: number, cz: number) => void;
  reset: () => void;
  markDirtyForEdits: (edits: VoxelEdit[]) => void;
  getDebugState: () => MeshedDebugState;

  debugCompare: DebugCompareConfig;
}) => {
  const {
    bridge,
    camera,
    tracking,
    chunkSize,
    prestigeLevel,
    seed,
    spawnX,
    spawnZ,
    terrain,
    chunkLoadConfig,
    ensureChunk,
    removeChunk,
    retryDroppedChunks,
    hasChunkWork,
    setFocusChunk,
    reset,
    markDirtyForEdits,
    getDebugState,
    debugCompare,
  } = args;

  const debugLastLogAtMsRef = useRef(0);
  const worldRef = useRef<string | undefined>(undefined);

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (tracking.activeChunks.current.has(key) && hasChunkWork(key)) return;
      tracking.activeChunks.current.add(key);
      ensureChunk(cx, cy, cz);
    },
    [ensureChunk, hasChunkWork, tracking.activeChunks],
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
    if (!debugCompare.enabled) return;
    return () => useUiStore.getState().setChunkDiagnostics(undefined);
  }, [debugCompare.enabled]);

  useEffect(() => {
    const direction = new Vector3();
    let lastPrefetchAt = -Infinity;
    let lastHeading = Infinity;
    let lastColumnX = Infinity;
    let lastColumnZ = Infinity;

    const coverageRadius = Math.max(3, chunkLoadConfig.activeRadius);
    const evictionRadius = coverageRadius + 3;
    const surfaceRanges = new Map<string, { minY: number; maxY: number }>();
    const prefetchSurfaceColumn = (cx: number, cz: number) => {
      const key = `${cx},${cz}`;
      let range = surfaceRanges.get(key);
      if (!range) {
        let low = Infinity;
        let high = -Infinity;
        for (let dz = -1; dz <= chunkSize; dz++) {
          for (let dx = -1; dx <= chunkSize; dx++) {
            const height = getSurfaceHeightCore(
              cx * chunkSize + dx,
              cz * chunkSize + dz,
              seed,
              terrain.surfaceBias,
              terrain.quantizeScale,
            );
            low = Math.min(low, height);
            high = Math.max(high, height);
          }
        }
        range = { minY: Math.floor(low / chunkSize), maxY: Math.floor(high / chunkSize) };
        surfaceRanges.set(key, range);
      }
      for (let cy = range.maxY; cy >= range.minY; cy--) addChunk(cx, cy, cz);
    };

    return bridge.onFrame((frame) => {
      const world = `${frame.ui.prestigeLevel}:${frame.ui.actualSeed ?? seed}`;
      if (worldRef.current !== undefined && worldRef.current !== world) {
        tracking.activeChunks.current.clear();
        tracking.lastRequestedPlayerChunkRef.current = null;
        lastHeading = Infinity;
        lastPrefetchAt = -Infinity;
        reset();
        resetVoxelEdits();
      }
      worldRef.current = world;

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

      if (shouldRequest) {
        const moveX = lastReq ? Math.sign(pcx - lastReq.cx) : 0;
        const moveZ = lastReq ? Math.sign(pcz - lastReq.cz) : 0;
        if (moveX || moveZ) {
          forEachForwardChunkColumn(pcx, pcz, moveX, moveZ, coverageRadius, prefetchSurfaceColumn);
        }
        forEachRadialChunk({ cx: pcx, cy: 0, cz: pcz }, coverageRadius, 2, ({ cx, cz }) =>
          prefetchSurfaceColumn(cx, cz),
        );
        for (const key of tracking.activeChunks.current) {
          const [cx, cy, cz] = key.split(",").map(Number);
          const range = surfaceRanges.get(`${cx},${cz}`);
          const closeToSurface = range && cy >= range.minY && cy <= range.maxY;
          if (
            Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) <= evictionRadius &&
            (closeToSurface || Math.abs(cy - pcy) <= evictionRadius)
          )
            continue;
          removeChunk(key);
          tracking.activeChunks.current.delete(key);
        }
        for (const key of surfaceRanges.keys()) {
          const [cx, cz] = key.split(",").map(Number);
          if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > evictionRadius)
            surfaceRanges.delete(key);
        }
      }

      const now = performance.now();
      if (now - lastPrefetchAt >= 125) {
        lastPrefetchAt = now;
        retryDroppedChunks();
        camera.getWorldDirection(direction);
        if (direction.x * direction.x + direction.z * direction.z > 0.01) {
          const heading = Math.round(Math.atan2(direction.z, direction.x) / (Math.PI / 4));
          if (
            heading !== lastHeading ||
            pcx !== lastColumnX ||
            pcz !== lastColumnZ ||
            shouldRequest
          ) {
            if (heading !== lastHeading && !shouldRequest) setFocusChunk(pcx, pcy, pcz);
            lastHeading = heading;
            lastColumnX = pcx;
            lastColumnZ = pcz;
            const angle = (heading * Math.PI) / 4;
            forEachForwardChunkColumn(
              pcx,
              pcz,
              Math.round(Math.cos(angle)),
              Math.round(Math.sin(angle)),
              coverageRadius,
              prefetchSurfaceColumn,
            );
          }
        }
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
          const queued = new Set(dbg.dirtyKeys);
          const inFlight = new Set(dbg.inFlightKeys);
          const pendingApply = new Set(dbg.pendingResultKeys);
          const failed = new Set(dbg.failedKeys);
          const emptyKeySet = new Set(dbg.emptyChunkKeys);

          const missingMeshes = expectedChunkKeys.filter((k) => !meshKeySet.has(k));
          const missingNotRequested = missingMeshes.filter(
            (k) => !tracking.activeChunks.current.has(k),
          );
          const missingRequestedPending = missingMeshes.filter(
            (k) => queued.has(k) || inFlight.has(k) || pendingApply.has(k),
          );
          const missingRequestedFailed = missingMeshes.filter((k) => failed.has(k));
          const missingRequestedWithoutWork = missingMeshes.filter(
            (k) =>
              tracking.activeChunks.current.has(k) &&
              !queued.has(k) &&
              !inFlight.has(k) &&
              !pendingApply.has(k) &&
              !failed.has(k) &&
              !emptyKeySet.has(k),
          );
          const missingRequestedEmpty = missingMeshes.filter(
            (k) => tracking.activeChunks.current.has(k) && emptyKeySet.has(k),
          );

          const requestedChunkCount = expectedChunkKeys.filter((k) =>
            tracking.activeChunks.current.has(k),
          ).length;

          useUiStore.getState().setChunkDiagnostics({
            Ready: dbg.meshChunkKeys.length,
            Empty: dbg.emptyChunkKeys.length,
            Queued: queued.size,
            Meshing: inFlight.size,
            "Awaiting display": pendingApply.size,
            Failed: failed.size,
            "Local unrequested": missingNotRequested.length,
            "Local unscheduled": missingRequestedWithoutWork.length,
          });

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
              queuedChunkKeys: dbg.dirtyKeys.slice(0, 20),
              inFlightChunkKeys: dbg.inFlightKeys.slice(0, 20),
              missingRequestedFailed: missingRequestedFailed.slice(0, 20),
              missingRequestedWithoutWork: missingRequestedWithoutWork.slice(0, 20),
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
    camera,
    chunkLoadConfig.activeDims,
    chunkLoadConfig.activeRadius,
    chunkSize,
    debugCompare.enabled,
    debugCompare.logIntervalMs,
    debugCompare.radiusChunks,
    ensureInitialChunk,
    getDebugState,
    markDirtyForEdits,
    removeChunk,
    retryDroppedChunks,
    prestigeLevel,
    seed,
    terrain.surfaceBias,
    terrain.quantizeScale,
    reset,
    setFocusChunk,
    tracking.activeChunks,
    tracking.initialSurfaceChunkRef,
    tracking.lastRequestedPlayerChunkRef,
  ]);
};
