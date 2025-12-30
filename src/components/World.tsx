import React, { useCallback, useEffect, useRef, useState } from "react";

import type { VoxelRenderMode } from "../config/render";
import { useConfig } from "../config/useConfig";
import { playerChunk, playerPosition } from "../engine/playerState";
import { voxelKey } from "../shared/voxel";
import { applyVoxelEdits, getGroundHeightWithEdits, MATERIAL_SOLID, resetVoxelEdits } from "../sim/collision";
import { getSeed } from "../sim/seed";
import { getSurfaceHeightCore } from "../sim/terrain-core";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { forEachRadialChunk } from "../utils";
import { chunkKey, ensureNeighborChunksForMinedVoxel, populateChunkVoxels } from "./world/chunkHelpers";
import {
  countDenseSolidsInChunk,
  makeVoxelBoundsForChunkRadius,
  makeXzBoundsForChunkRadius,
  voxelInBounds,
  xzInBounds,
} from "./world/renderDebugCompare";
import { useInstancedVoxels } from "./world/useInstancedVoxels";
import { useMeshedChunks } from "./world/useMeshedChunks";

const VoxelLayerInstanced: React.FC<{
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

  const debugCfg = cfg.render.voxels.debugCompare;
  const debugEnabled = debugCfg.enabled;
  const debugLastLogAtMsRef = useRef(0);
  const frontierKeysRef = useRef<Set<string>>(new Set());
  const lastMissingMarkerKeyRef = useRef<string | null>(null);
  const [missingSurfaceMarker, setMissingSurfaceMarker] = useState<{ x: number; y: number; z: number } | null>(null);
  const debugBoundsRef = useRef(
    makeVoxelBoundsForChunkRadius({ cx: 0, cy: 0, cz: 0 }, debugCfg.radiusChunks, chunkSize),
  );

  const { addVoxel, capacity, clear, ensureCapacity, flushRebuild, meshRef, removeVoxel, solidCountRef } =
    useInstancedVoxels(chunkSize, cfg.terrain.waterLevel);

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
  }, [addChunk, chunkSize, cfg.terrain.quantizeScale, cfg.terrain.surfaceBias, seed, spawnX, spawnZ]);

  useEffect(() => {
    if (voxelRenderMode === "frontier" && !requestedFrontierSnapshotRef.current) {
      requestedFrontierSnapshotRef.current = true;
      bridge.enqueue({ t: "REQUEST_FRONTIER_SNAPSHOT" });
    }

    if (voxelRenderMode !== "frontier") {
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

        if (voxelRenderMode === "frontier") {
          bridge.enqueue({ t: "SET_PLAYER_CHUNK", cx: pcx, cy: pcy, cz: pcz });
          sentFrontierChunkRef.current = true;
        } else {
          // Prioritize nearby chunks in radial order to fill nearest areas first
          forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, 1, 3, (c) => {
            addChunk(c.cx, c.cy, c.cz);
          });
        }
      }

      if (voxelRenderMode === "frontier" && !sentFrontierChunkRef.current) {
        bridge.enqueue({ t: "SET_PLAYER_CHUNK", cx: pcx, cy: pcy, cz: pcz });
        sentFrontierChunkRef.current = true;
      }

      if (voxelRenderMode === "frontier") {
        if (frame.delta.frontierReset) {
          frontierKeysRef.current.clear();
        }

        if (frame.delta.frontierAdd && frame.delta.frontierAdd.length > 0) {
          ensureCapacity(solidCountRef.current + frame.delta.frontierAdd.length / 3);
          const positions = frame.delta.frontierAdd;
          for (let i = 0; i < positions.length; i += 3) {
            addVoxel(positions[i], positions[i + 1], positions[i + 2]);
            frontierKeysRef.current.add(voxelKey(positions[i], positions[i + 1], positions[i + 2]));
          }
        }

        if (frame.delta.frontierRemove && frame.delta.frontierRemove.length > 0) {
          const positions = frame.delta.frontierRemove;
          for (let i = 0; i < positions.length; i += 3) {
            removeVoxel(positions[i], positions[i + 1], positions[i + 2]);
            frontierKeysRef.current.delete(voxelKey(positions[i], positions[i + 1], positions[i + 2]));
          }
        }

        if (debugEnabled) {
          const now = performance.now();
          if (now - debugLastLogAtMsRef.current >= debugCfg.logIntervalMs) {
            debugLastLogAtMsRef.current = now;

            const bounds = debugBoundsRef.current;
            const xzBounds = makeXzBoundsForChunkRadius({ cx: pcx, cy: pcy, cz: pcz }, debugCfg.radiusChunks, chunkSize);

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

            console.groupCollapsed(
              `[render-debug] frontier pc=(${pcx},${pcy},${pcz}) radius=${radius} chunksize=${chunkSize}`,
            );
            console.log({
              denseBaselineSolidCount: denseSolids,
              frontierSurfaceExpected,
              frontierSurfaceMissingCount: missingSurfaceCount,
              frontierSurfaceMissingSample: missingSurfaceKeys,
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
            });
            console.groupEnd();

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

      {voxelRenderMode === "frontier" && debugEnabled && missingSurfaceMarker ? (
        <mesh position={[missingSurfaceMarker.x, missingSurfaceMarker.y, missingSurfaceMarker.z]}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#ff00ff" wireframe={true} transparent={true} opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
};

const VoxelLayerMeshed: React.FC<{
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

  const { ensureChunk, getDebugState, groupRef, markDirtyForEdits, reset, setFocusChunk } = useMeshedChunks({
    chunkSize,
    prestigeLevel,
    waterLevel: cfg.terrain.waterLevel,
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
    forEachRadialChunk({ cx: baseCx, cy, cz: baseCz }, 1, 2, (c) => {
      addChunk(c.cx, cy, c.cz);
    });
  }, [addChunk, chunkSize, cfg.terrain.quantizeScale, cfg.terrain.surfaceBias, seed, setFocusChunk, spawnX, spawnZ]);

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
      const shouldRequest = !lastReq || lastReq.cx !== pcx || lastReq.cy !== pcy || lastReq.cz !== pcz;
      if (shouldRequest) {
        lastRequestedPlayerChunkRef.current = { cx: pcx, cy: pcy, cz: pcz };
        playerChunk.cx = pcx;
        playerChunk.cy = pcy;
        playerChunk.cz = pcz;
        setFocusChunk(pcx, pcy, pcz);
        // Ensure the same 3D neighborhood we debug/expect is actually requested.
        forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, 1, 3, (c) => {
          addChunk(c.cx, c.cy, c.cz);
        });
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

          const requestedChunkCount = expectedChunkKeys.filter((k) => activeChunks.current.has(k)).length;

          console.groupCollapsed(
            `[render-debug] meshed pc=(${pcx},${pcy},${pcz}) radius=${radius} chunksize=${chunkSize}`,
          );
          console.log({
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
          console.groupEnd();
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
    markDirtyForEdits,
    prestigeLevel,
    reset,
    setFocusChunk,
  ]);

  return <group ref={groupRef} />;
};

export const World: React.FC = () => {
  const cfg = useConfig();
  const prestigeLevel = useUiStore((state) => state.snapshot.prestigeLevel);
  const seed = getSeed(prestigeLevel);
  const chunkSize = cfg.terrain.chunkSize ?? 16;
  const spawnX = cfg.player.spawnX ?? 0;
  const spawnZ = cfg.player.spawnZ ?? 0;
  const voxelRenderMode = cfg.render.voxels.mode;

  return (
    <group>
      {voxelRenderMode === "meshed" ? (
        <VoxelLayerMeshed
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          seed={seed}
          spawnX={spawnX}
          spawnZ={spawnZ}
        />
      ) : (
        <VoxelLayerInstanced
          chunkSize={chunkSize}
          prestigeLevel={prestigeLevel}
          seed={seed}
          spawnX={spawnX}
          spawnZ={spawnZ}
          voxelRenderMode={voxelRenderMode}
        />
      )}

      {/* Water Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, cfg.terrain.waterLevel, 0]} receiveShadow>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 20, cfg.terrain.worldRadius * 2 + 20]} />
        <meshStandardMaterial color="#42a7ff" transparent opacity={0.7} roughness={0.0} metalness={0.3} />
      </mesh>

      {/* Bedrock plane for world bounds */}
      <mesh position={[0, cfg.terrain.bedrockY ?? -50, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cfg.terrain.worldRadius * 2 + 10, cfg.terrain.worldRadius * 2 + 10]} />
        <meshStandardMaterial color="#333" roughness={1} />
      </mesh>
    </group>
  );
};
