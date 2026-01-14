import { useCallback, useRef, useState } from "react";

import { useConfig } from "../../../config/useConfig";
import type { RenderDelta } from "../../../shared/protocol";
import { coordsFromVoxelKey, type VoxelKey, voxelKey } from "../../../shared/voxel";
import { getGroundHeightWithEdits } from "../../../sim/collision";
import { forEachRadialChunk } from "../../../utils";
import { debug, groupCollapsed, groupEnd } from "../../../utils/logger";
import {
  countDenseSolidsInChunk,
  getMissingFrontierVoxelsInChunk,
  makeVoxelBoundsForChunkRadius,
  makeXzBoundsForChunkRadius,
  voxelInBounds,
  xzInBounds,
} from "../renderDebugCompare";

interface UseVoxelLayerDebugProps {
  chunkSize: number;
  prestigeLevel: number;
}

export function useVoxelLayerDebug({ chunkSize, prestigeLevel }: UseVoxelLayerDebugProps) {
  const cfg = useConfig();
  const debugCfg = cfg.render.voxels.debugCompare;
  const debugEnabled = debugCfg.enabled;
  const debugLastLogAtMsRef = useRef(0);
  const frontierKeysRef = useRef<Set<VoxelKey>>(new Set());
  const lastMissingMarkerKeyRef = useRef<VoxelKey | null>(null);
  const [missingSurfaceMarker, setMissingSurfaceMarker] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const debugBoundsRef = useRef(
    makeVoxelBoundsForChunkRadius({ cx: 0, cy: 0, cz: 0 }, debugCfg.radiusChunks, chunkSize),
  );

  const updateDebugBounds = useCallback(
    (cx: number, cy: number, cz: number) => {
      if (debugEnabled) {
        debugBoundsRef.current = makeVoxelBoundsForChunkRadius(
          { cx, cy, cz },
          debugCfg.radiusChunks,
          chunkSize,
        );
      }
    },
    [chunkSize, debugEnabled, debugCfg.radiusChunks],
  );

  const trackFrontierAdd = useCallback(
    (positions: Float32Array | number[]) => {
      if (!debugEnabled) return;
      for (let i = 0; i < positions.length; i += 3) {
        frontierKeysRef.current.add(voxelKey(positions[i], positions[i + 1], positions[i + 2]));
      }
    },
    [debugEnabled],
  );

  const trackFrontierRemove = useCallback(
    (positions: Float32Array | number[]) => {
      if (!debugEnabled) return;
      for (let i = 0; i < positions.length; i += 3) {
        frontierKeysRef.current.delete(voxelKey(positions[i], positions[i + 1], positions[i + 2]));
      }
    },
    [debugEnabled],
  );

  const clearFrontierKeys = useCallback(() => {
    frontierKeysRef.current.clear();
  }, []);

  const logDebugInfo = useCallback(
    (pcx: number, pcy: number, pcz: number, frame: { delta: RenderDelta }) => {
      if (!debugEnabled) return;

      const now = performance.now();
      if (now - debugLastLogAtMsRef.current < debugCfg.logIntervalMs) return;
      debugLastLogAtMsRef.current = now;

      const bounds = debugBoundsRef.current;
      const xzBounds = makeXzBoundsForChunkRadius(
        { cx: pcx, cy: pcy, cz: pcz },
        debugCfg.radiusChunks,
        chunkSize,
      );

      let frontierInRegion3d = 0;
      let frontierInRegionXz = 0;
      let frontierMinY = Number.POSITIVE_INFINITY;
      let frontierMaxY = Number.NEGATIVE_INFINITY;

      let trackedMinX = Number.POSITIVE_INFINITY;
      let trackedMaxX = Number.NEGATIVE_INFINITY;
      let trackedMinZ = Number.POSITIVE_INFINITY;
      let trackedMaxZ = Number.NEGATIVE_INFINITY;
      const xzPairsInRegion = new Set<string>();

      // We iterate over keys to gather stats
      for (const k of frontierKeysRef.current) {
        const { x, y, z } = coordsFromVoxelKey(k);
        trackedMinX = Math.min(trackedMinX, x);
        trackedMaxX = Math.max(trackedMaxX, x);
        trackedMinZ = Math.min(trackedMinZ, z);
        trackedMaxZ = Math.max(trackedMaxZ, z);
        if (voxelInBounds(bounds, x, y, z)) frontierInRegion3d += 1;
        if (xzInBounds(xzBounds, x, z)) {
          frontierInRegionXz += 1;
          xzPairsInRegion.add(`${x},${z}`);
          frontierMinY = Math.min(frontierMinY, y);
          frontierMaxY = Math.max(frontierMaxY, y);
        }
      }

      if (frontierMinY === Number.POSITIVE_INFINITY) frontierMinY = 0;
      if (frontierMaxY === Number.NEGATIVE_INFINITY) frontierMaxY = 0;
      if (trackedMinX === Number.POSITIVE_INFINITY) trackedMinX = 0;
      if (trackedMaxX === Number.NEGATIVE_INFINITY) trackedMaxX = 0;
      if (trackedMinZ === Number.POSITIVE_INFINITY) trackedMinZ = 0;
      if (trackedMaxZ === Number.NEGATIVE_INFINITY) trackedMaxZ = 0;

      let denseSolids = 0;
      let frontierSurfaceExpected = 0;
      const radius = debugCfg.radiusChunks;

      forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, radius, 3, (c) => {
        denseSolids += countDenseSolidsInChunk({
          cx: c.cx,
          cy: c.cy,
          cz: c.cz,
          chunkSize,
          prestigeLevel,
        });
      });

      const bedrockY = cfg.terrain.bedrockY ?? -50;
      const worldRadius = cfg.terrain.worldRadius;

      const minX = Math.max(xzBounds.minX, -worldRadius);
      const maxX = Math.min(xzBounds.maxX, worldRadius);
      const minZ = Math.max(xzBounds.minZ, -worldRadius);
      const maxZ = Math.min(xzBounds.maxZ, worldRadius);

      const missingSurfaceKeys: VoxelKey[] = [];
      let missingSurfaceCount = 0;
      for (let x = minX; x <= maxX; x += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const groundY = getGroundHeightWithEdits(x, z, prestigeLevel);
          if (groundY <= bedrockY) continue;
          frontierSurfaceExpected += 1;

          const expectedKey = voxelKey(x, groundY, z);
          if (!frontierKeysRef.current.has(expectedKey)) {
            missingSurfaceCount += 1;
            if (missingSurfaceKeys.length < 20) missingSurfaceKeys.push(expectedKey);
          }
        }
      }

      let trueFrontierExpected = 0;
      const trueFrontierMissingKeys: VoxelKey[] = [];

      forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, radius, 3, (c) => {
        const res = getMissingFrontierVoxelsInChunk({
          cx: c.cx,
          cy: c.cy,
          cz: c.cz,
          chunkSize,
          prestigeLevel,
          trackedKeys: frontierKeysRef.current,
        });
        trueFrontierExpected += res.expectedFrontierCount;
        if (res.missingKeys.length > 0) {
          trueFrontierMissingKeys.push(...res.missingKeys);
        }
      });

      if (process.env.NODE_ENV === "development") {
        groupCollapsed(
          `[render-debug] frontier pc=(${pcx},${pcy},${pcz}) radius=${radius} chunksize=${chunkSize}`,
        );
        debug({
          denseBaselineSolidCount: denseSolids,
          frontierSurfaceExpected,
          frontierSurfaceMissingCount: missingSurfaceCount,
          frontierSurfaceMissingSample: missingSurfaceKeys,

          trueFrontierExpected,
          trueFrontierMissingCount: trueFrontierMissingKeys.length,
          trueFrontierMissingSample: trueFrontierMissingKeys.slice(0, 20),

          frontierRenderedInRegion3d: frontierInRegion3d,
          frontierRenderedInRegionXz: frontierInRegionXz,
          frontierRenderedUniqueColumnsInXz: xzPairsInRegion.size,
          frontierRenderedYRangeInXz: [frontierMinY, frontierMaxY],
          frontierTotalRenderedTracked: frontierKeysRef.current.size,
          trackedXzRange: {
            minX: trackedMinX,
            maxX: trackedMaxX,
            minZ: trackedMinZ,
            maxZ: trackedMaxZ,
          },
          xzBounds,
          terrain: {
            worldRadius: cfg.terrain.worldRadius,
            bedrockY: cfg.terrain.bedrockY ?? -50,
            surfaceBias: cfg.terrain.surfaceBias,
            quantizeScale: cfg.terrain.quantizeScale,
          },
          deltaFrontierAdd: frame.delta.frontierAdd?.length ?? 0,
          deltaFrontierRemove: frame.delta.frontierRemove?.length ?? 0,
          debugChunksProcessed: frame.delta.debugChunksProcessed,
          debugQueueLengthAtTickStart: frame.delta.debugQueueLengthAtTickStart,
        });
        groupEnd();
      }

      const nextMarkerKey = missingSurfaceKeys[0] ?? null;
      if (nextMarkerKey !== lastMissingMarkerKeyRef.current) {
        lastMissingMarkerKeyRef.current = nextMarkerKey;
        if (nextMarkerKey) {
          const coords = coordsFromVoxelKey(nextMarkerKey);
          setMissingSurfaceMarker({ x: coords.x, y: coords.y, z: coords.z });
        } else {
          setMissingSurfaceMarker(null);
        }
      }
    },
    [
      chunkSize,
      debugCfg.logIntervalMs,
      debugCfg.radiusChunks,
      debugEnabled,
      prestigeLevel,
      cfg.terrain,
    ],
  );

  return {
    debugEnabled,
    debugCfg,
    missingSurfaceMarker,
    updateDebugBounds,
    trackFrontierAdd,
    trackFrontierRemove,
    clearFrontierKeys,
    logDebugInfo,
  };
}
