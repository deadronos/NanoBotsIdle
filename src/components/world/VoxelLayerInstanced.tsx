import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Color } from "three";

import type { VoxelRenderMode } from "../../config/render";
import { useConfig } from "../../config/useConfig";
import { playerChunk, playerPosition } from "../../engine/playerState";
import { voxelKey } from "../../shared/voxel";
import { getBiomeAt, getBiomeColor } from "../../sim/biomes";
import {
  applyVoxelEdits,
  getGroundHeightWithEdits,
  MATERIAL_SOLID,
  resetVoxelEdits,
} from "../../sim/collision";
import { getSurfaceHeightCore } from "../../sim/terrain-core";
import { getSimBridge } from "../../simBridge/simBridge";
import { forEachRadialChunk, getVoxelColor } from "../../utils";
import { debug, groupCollapsed, groupEnd } from "../../utils/logger";
import { chunkKey, ensureNeighborChunksForMinedVoxel, populateChunkVoxels } from "./chunkHelpers";
import { FrontierFillRenderer } from "./FrontierFillRenderer";
import {
  countDenseSolidsInChunk,
  getMissingFrontierVoxelsInChunk,
  makeVoxelBoundsForChunkRadius,
  makeXzBoundsForChunkRadius,
  voxelInBounds,
  xzInBounds,
} from "./renderDebugCompare";
import { useInstancedVoxels } from "./useInstancedVoxels";

export const VoxelLayerInstanced: React.FC<{
  chunkSize: number;
  prestigeLevel: number;
  spawnX: number;
  spawnZ: number;
  seed: number;
  voxelRenderMode: Exclude<VoxelRenderMode, "meshed">;
}> = ({ chunkSize, prestigeLevel, seed, spawnX, spawnZ, voxelRenderMode }) => {
  const activeChunks = useRef<Set<string>>(new Set());
  const cfg = useConfig();
  const bridge = getSimBridge();
  const sentFrontierChunkRef = useRef(false);
  const requestedFrontierSnapshotRef = useRef(false);

  const biomeOverlayEnabled = cfg.render.voxels.biomeOverlay.enabled;
  const biomeColorCacheRef = useRef<Map<string, Color>>(new Map());

  useEffect(() => {
    biomeColorCacheRef.current.clear();
  }, [
    biomeOverlayEnabled,
    cfg.terrain.quantizeScale,
    cfg.terrain.surfaceBias,
    cfg.terrain.waterLevel,
    seed,
  ]);

  const debugCfg = cfg.render.voxels.debugCompare;
  const debugEnabled = debugCfg.enabled;
  const debugLastLogAtMsRef = useRef(0);
  const frontierKeysRef = useRef<Set<string>>(new Set());
  const lastMissingMarkerKeyRef = useRef<string | null>(null);
  const [missingSurfaceMarker, setMissingSurfaceMarker] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const debugBoundsRef = useRef(
    makeVoxelBoundsForChunkRadius({ cx: 0, cy: 0, cz: 0 }, debugCfg.radiusChunks, chunkSize),
  );

  const getInstanceColor = useCallback(
    (x: number, y: number, z: number) => {
      if (!biomeOverlayEnabled) return getVoxelColor(y, cfg.terrain.waterLevel);

      const xi = Math.floor(x);
      const zi = Math.floor(z);
      const key = `${xi},${zi}`;
      const cached = biomeColorCacheRef.current.get(key);
      if (cached) return cached;

      const surfaceY = getSurfaceHeightCore(
        xi,
        zi,
        seed,
        cfg.terrain.surfaceBias,
        cfg.terrain.quantizeScale,
      );
      const biome = getBiomeAt(xi, zi, seed, surfaceY, cfg.terrain.waterLevel);
      const color = getBiomeColor(biome);
      biomeColorCacheRef.current.set(key, color);
      return color;
    },
    [
      biomeOverlayEnabled,
      cfg.terrain.quantizeScale,
      cfg.terrain.surfaceBias,
      cfg.terrain.waterLevel,
      seed,
    ],
  );

  const {
    addVoxel,
    capacity,
    clear,
    ensureCapacity,
    flushRebuild,
    meshRef,
    removeVoxel,
    solidCountRef,
  } = useInstancedVoxels(chunkSize, cfg.terrain.waterLevel, getInstanceColor);

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (activeChunks.current.has(key)) return;
      activeChunks.current.add(key);

      ensureCapacity(solidCountRef.current + chunkSize * chunkSize * chunkSize);
      populateChunkVoxels({ cx, cy, cz, chunkSize, prestigeLevel, addVoxel });
    },
    [addVoxel, chunkSize, ensureCapacity, prestigeLevel, solidCountRef],
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
    forEachRadialChunk({ cx: baseCx, cy, cz: baseCz }, 1, 2, (c) => {
      addChunk(c.cx, cy, c.cz);
    });
  }, [
    addChunk,
    chunkSize,
    cfg.terrain.quantizeScale,
    cfg.terrain.surfaceBias,
    seed,
    spawnX,
    spawnZ,
  ]);

  useEffect(() => {
    if (
      (voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill") &&
      !requestedFrontierSnapshotRef.current
    ) {
      requestedFrontierSnapshotRef.current = true;
      bridge.enqueue({ t: "REQUEST_FRONTIER_SNAPSHOT" });
    }

    if (voxelRenderMode !== "frontier" && voxelRenderMode !== "frontier-fill") {
      requestedFrontierSnapshotRef.current = false;
      sentFrontierChunkRef.current = false;
    }

    return bridge.onFrame((frame) => {
      if (frame.delta.frontierReset) {
        activeChunks.current.clear();
        clear();
        resetVoxelEdits();
        sentFrontierChunkRef.current = false;
      }

      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
      }

      // Poll player chunk (used by frontier mode to expand frontier; used by dense mode to load chunks)
      const px = playerPosition.x;
      const py = playerPosition.y;
      const pz = playerPosition.z;
      const pcx = Math.floor(px / chunkSize);
      const pcy = Math.floor(py / chunkSize);
      const pcz = Math.floor(pz / chunkSize);

      if (pcx !== playerChunk.cx || pcy !== playerChunk.cy || pcz !== playerChunk.cz) {
        playerChunk.cx = pcx;
        playerChunk.cy = pcy;
        playerChunk.cz = pcz;

        if (debugEnabled) {
          debugBoundsRef.current = makeVoxelBoundsForChunkRadius(
            { cx: pcx, cy: pcy, cz: pcz },
            debugCfg.radiusChunks,
            chunkSize,
          );
        }

        if (voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill") {
          bridge.enqueue({ t: "SET_PLAYER_CHUNK", cx: pcx, cy: pcy, cz: pcz });
          sentFrontierChunkRef.current = true;
        } else {
          // Prioritize nearby chunks in radial order to fill nearest areas first
          forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, 1, 3, (c) => {
            addChunk(c.cx, c.cy, c.cz);
          });
        }
      }

      const showFrontier = voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill";
      if (showFrontier && !sentFrontierChunkRef.current) {
        bridge.enqueue({ t: "SET_PLAYER_CHUNK", cx: pcx, cy: pcy, cz: pcz });
        sentFrontierChunkRef.current = true;
      }

      if (showFrontier) {
        if (frame.delta.frontierReset) {
          frontierKeysRef.current.clear();
        }

        if (frame.delta.frontierAdd && frame.delta.frontierAdd.length > 0) {
          const positions = frame.delta.frontierAdd;
          ensureCapacity(solidCountRef.current + positions.length / 3);
          for (let i = 0; i < positions.length; i += 3) {
            addVoxel(positions[i], positions[i + 1], positions[i + 2]);
            frontierKeysRef.current.add(voxelKey(positions[i], positions[i + 1], positions[i + 2]));
          }
        }

        if (frame.delta.frontierRemove && frame.delta.frontierRemove.length > 0) {
          const positions = frame.delta.frontierRemove;
          for (let i = 0; i < positions.length; i += 3) {
            removeVoxel(positions[i], positions[i + 1], positions[i + 2]);
            frontierKeysRef.current.delete(
              voxelKey(positions[i], positions[i + 1], positions[i + 2]),
            );
          }
        }

        if (debugEnabled) {
          const now = performance.now();
          if (now - debugLastLogAtMsRef.current >= debugCfg.logIntervalMs) {
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
            for (const k of frontierKeysRef.current) {
              const [x, y, z] = k.split(",").map((v) => Number(v));
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

            // Baselines (compute-only): dense solids in the same chunk cube, plus expected surface-frontier in the XZ region.
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

            // Engine frontier starts as surface-based, but drones can mine and expose new frontier.
            // For debug compare under active mining, use edits-aware ground height per (x,z).
            const bedrockY = cfg.terrain.bedrockY ?? -50;
            const worldRadius = cfg.terrain.worldRadius;

            // Compare only within configured world bounds.
            const minX = Math.max(xzBounds.minX, -worldRadius);
            const maxX = Math.min(xzBounds.maxX, worldRadius);
            const minZ = Math.max(xzBounds.minZ, -worldRadius);
            const maxZ = Math.min(xzBounds.maxZ, worldRadius);

            const missingSurfaceKeys: string[] = [];
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

            // Aggressive Compare: Check true frontier (all exposed faces) vs tracked keys.
            let trueFrontierExpected = 0;
            const trueFrontierMissingKeys: string[] = [];

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

            // Only emit verbose render-debug output in development to avoid noisy production logs
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

            // Place a visible marker on the first missing expected surface voxel (helps find ridge-line gaps).
            const nextMarkerKey = missingSurfaceKeys[0] ?? null;
            if (nextMarkerKey !== lastMissingMarkerKeyRef.current) {
              lastMissingMarkerKeyRef.current = nextMarkerKey;
              if (nextMarkerKey) {
                const [mx, my, mz] = nextMarkerKey.split(",").map((v) => Number(v));
                setMissingSurfaceMarker({ x: mx, y: my, z: mz });
              } else {
                setMissingSurfaceMarker(null);
              }
            }
          }
        }

        flushRebuild();
        return;
      }

      // Debug fallback: dense chunk volume scan.
      if (frame.delta.edits && frame.delta.edits.length > 0) {
        frame.delta.edits.forEach((edit) => {
          if (edit.mat === MATERIAL_SOLID) {
            addVoxel(edit.x, edit.y, edit.z);
          } else {
            removeVoxel(edit.x, edit.y, edit.z);
          }
        });
      }

      ensureInitialChunk();

      const mined = frame.delta.minedPositions;
      if (mined && mined.length > 0) {
        for (let i = 0; i < mined.length; i += 3) {
          ensureNeighborChunksForMinedVoxel({
            x: mined[i],
            y: mined[i + 1],
            z: mined[i + 2],
            chunkSize,
            addChunk,
          });
        }
      }

      flushRebuild();
    });
  }, [
    addChunk,
    addVoxel,
    bridge,
    chunkSize,
    clear,
    cfg.terrain.bedrockY,
    cfg.terrain.quantizeScale,
    cfg.terrain.surfaceBias,
    cfg.terrain.worldRadius,
    ensureCapacity,
    ensureInitialChunk,
    flushRebuild,
    removeVoxel,
    solidCountRef,
    debugCfg.logIntervalMs,
    debugCfg.radiusChunks,
    debugEnabled,
    prestigeLevel,
    seed,
    voxelRenderMode,
  ]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} metalness={0.1} vertexColors={true} />
      </instancedMesh>

      {(
        (voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill") &&
        debugEnabled &&
        missingSurfaceMarker
      ) ?
        <mesh position={[missingSurfaceMarker.x, missingSurfaceMarker.y, missingSurfaceMarker.z]}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#ff00ff" wireframe={true} transparent={true} opacity={0.9} />
        </mesh>
      : null}

      {voxelRenderMode === "frontier-fill" ?
        <FrontierFillRenderer
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          center={playerChunk}
          radius={debugCfg.radiusChunks}
          bedrockY={cfg.terrain.bedrockY ?? -50}
          waterLevel={cfg.terrain.waterLevel ?? -20}
        />
      : null}

      {/* Debug-only fill overlay for standard frontier mode if enabled? (Optional, user didn't ask for this but good to keep clean) */}
      {voxelRenderMode === "frontier" && debugEnabled ?
        <FrontierFillRenderer
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          center={playerChunk}
          radius={debugCfg.radiusChunks}
          bedrockY={cfg.terrain.bedrockY ?? -50}
          waterLevel={cfg.terrain.waterLevel ?? -20}
          debugVisuals={true}
        />
      : null}
    </group>
  );
};
