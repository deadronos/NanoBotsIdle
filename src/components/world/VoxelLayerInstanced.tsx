import React, { useCallback, useEffect, useRef } from "react";
import type { Color } from "three";

import type { VoxelRenderMode } from "../../config/render";
import { useConfig } from "../../config/useConfig";
import { playerChunk, playerPosition } from "../../engine/playerState";
import { getBiomeAt, getBiomeColor } from "../../sim/biomes";
import {
  applyVoxelEdits,
  MATERIAL_SOLID,
  resetVoxelEdits,
} from "../../sim/collision";
import { getSurfaceHeightCore } from "../../sim/terrain-core";
import { getSimBridge } from "../../simBridge/simBridge";
import { forEachRadialChunk, getVoxelColor } from "../../utils";
import { ensureNeighborChunksForMinedVoxel } from "./chunkHelpers";
import { FrontierFillRenderer } from "./FrontierFillRenderer";
import { useFrontierLogic } from "./hooks/useFrontierLogic";
import { useVoxelChunkManager } from "./hooks/useVoxelChunkManager";
// Hooks
import { useVoxelLayerDebug } from "./hooks/useVoxelLayerDebug";
import { useInstancedVoxels } from "./useInstancedVoxels";

export const VoxelLayerInstanced: React.FC<{
  chunkSize: number;
  prestigeLevel: number;
  spawnX: number;
  spawnZ: number;
  seed: number;
  voxelRenderMode: Exclude<VoxelRenderMode, "meshed">;
}> = ({ chunkSize, prestigeLevel, seed, spawnX, spawnZ, voxelRenderMode }) => {
  const cfg = useConfig();
  const bridge = getSimBridge();

  const biomeOverlayEnabled = cfg.render.voxels.biomeOverlay.enabled;
  const biomeColorCacheRef = useRef<Map<string, Color>>(new Map());

  // --- Hooks ---
  const {
    debugEnabled,
    debugCfg,
    missingSurfaceMarker,
    updateDebugBounds,
    trackFrontierAdd,
    trackFrontierRemove,
    clearFrontierKeys,
    logDebugInfo,
  } = useVoxelLayerDebug({ chunkSize, prestigeLevel });

  const { sentFrontierChunkRef } = useFrontierLogic({ voxelRenderMode });

  useEffect(() => {
    biomeColorCacheRef.current.clear();
  }, [
    biomeOverlayEnabled,
    cfg.terrain.quantizeScale,
    cfg.terrain.surfaceBias,
    cfg.terrain.waterLevel,
    seed,
  ]);

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

  const { addChunk, ensureInitialChunk, resetChunks } = useVoxelChunkManager({
    chunkSize,
    prestigeLevel,
    spawnX,
    spawnZ,
    seed,
    ensureCapacity,
    solidCountRef,
    addVoxel,
  });

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.frontierReset) {
        resetChunks();
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

        updateDebugBounds(pcx, pcy, pcz);

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
          clearFrontierKeys();
        }

        if (frame.delta.frontierAdd && frame.delta.frontierAdd.length > 0) {
          const positions = frame.delta.frontierAdd;
          ensureCapacity(solidCountRef.current + positions.length / 3);
          for (let i = 0; i < positions.length; i += 3) {
            addVoxel(positions[i], positions[i + 1], positions[i + 2]);
          }
          trackFrontierAdd(positions);
        }

        if (frame.delta.frontierRemove && frame.delta.frontierRemove.length > 0) {
          const positions = frame.delta.frontierRemove;
          for (let i = 0; i < positions.length; i += 3) {
            removeVoxel(positions[i], positions[i + 1], positions[i + 2]);
          }
          trackFrontierRemove(positions);
        }

        logDebugInfo(pcx, pcy, pcz, frame);

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
    ensureCapacity,
    ensureInitialChunk,
    flushRebuild,
    removeVoxel,
    solidCountRef,
    voxelRenderMode,
    resetChunks,
    updateDebugBounds,
    sentFrontierChunkRef,
    trackFrontierAdd,
    trackFrontierRemove,
    clearFrontierKeys,
    logDebugInfo,
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

      {/* Debug-only fill overlay for standard frontier mode if enabled? */}
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
