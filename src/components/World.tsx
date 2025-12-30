import React, { useCallback, useEffect, useRef } from "react";

import type { VoxelRenderMode } from "../config/render";
import { useConfig } from "../config/useConfig";
import { playerChunk, playerPosition } from "../engine/playerState";
import { voxelKey } from "../shared/voxel";
import { applyVoxelEdits, MATERIAL_SOLID, resetVoxelEdits } from "../sim/collision";
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

  const debugCfg = cfg.render.voxels.debugCompare;
  const debugEnabled = debugCfg.enabled;
  const debugLastLogAtMsRef = useRef(0);
  const debugFrontierKeysRef = useRef<Set<string>>(new Set());
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
        if (debugEnabled && frame.delta.frontierReset) {
          debugFrontierKeysRef.current.clear();
        }

        if (frame.delta.frontierAdd && frame.delta.frontierAdd.length > 0) {
          ensureCapacity(solidCountRef.current + frame.delta.frontierAdd.length / 3);
          const positions = frame.delta.frontierAdd;
          for (let i = 0; i < positions.length; i += 3) {
            addVoxel(positions[i], positions[i + 1], positions[i + 2]);
            if (debugEnabled) {
              debugFrontierKeysRef.current.add(voxelKey(positions[i], positions[i + 1], positions[i + 2]));
            }
          }
        }

        if (frame.delta.frontierRemove && frame.delta.frontierRemove.length > 0) {
          const positions = frame.delta.frontierRemove;
          for (let i = 0; i < positions.length; i += 3) {
            removeVoxel(positions[i], positions[i + 1], positions[i + 2]);
            if (debugEnabled) {
              debugFrontierKeysRef.current.delete(voxelKey(positions[i], positions[i + 1], positions[i + 2]));
            }
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
            for (const k of debugFrontierKeysRef.current) {
              const [x, y, z] = k.split(",").map((v) => Number(v));
              if (voxelInBounds(bounds, x, y, z)) frontierInRegion3d += 1;
              if (xzInBounds(xzBounds, x, z)) {
                frontierInRegionXz += 1;
                frontierMinY = Math.min(frontierMinY, y);
                frontierMaxY = Math.max(frontierMaxY, y);
              }
            }

            if (frontierMinY === Number.POSITIVE_INFINITY) frontierMinY = 0;
            if (frontierMaxY === Number.NEGATIVE_INFINITY) frontierMaxY = 0;

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

            // Engine frontier is surface-based: one voxel per (x,z) at the surface height.
            const bedrockY = cfg.terrain.bedrockY ?? -50;
            for (let x = xzBounds.minX; x <= xzBounds.maxX; x += 1) {
              for (let z = xzBounds.minZ; z <= xzBounds.maxZ; z += 1) {
                const surfaceY = getSurfaceHeightCore(
                  x,
                  z,
                  seed,
                  cfg.terrain.surfaceBias,
                  cfg.terrain.quantizeScale,
                );
                if (surfaceY <= bedrockY) continue;
                frontierSurfaceExpected += 1;
              }
            }

            console.groupCollapsed(
              `[render-debug] frontier pc=(${pcx},${pcy},${pcz}) radius=${radius} chunksize=${chunkSize}`,
            );
            console.log({
              denseBaselineSolidCount: denseSolids,
              frontierSurfaceExpected,
              frontierRenderedInRegion3d: frontierInRegion3d,
              frontierRenderedInRegionXz: frontierInRegionXz,
              frontierRenderedYRangeInXz: [frontierMinY, frontierMaxY],
              frontierTotalRenderedTracked: debugFrontierKeysRef.current.size,
              deltaFrontierAdd: frame.delta.frontierAdd?.length ?? 0,
              deltaFrontierRemove: frame.delta.frontierRemove?.length ?? 0,
            });
            console.groupEnd();
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} metalness={0.1} vertexColors={true} />
    </instancedMesh>
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
