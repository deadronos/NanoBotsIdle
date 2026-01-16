import React, { useCallback, useEffect, useRef } from "react";

import type { VoxelRenderMode } from "../../config/render";
import { useConfig } from "../../config/useConfig";
import { playerChunk } from "../../engine/playerState";
import { getBiomeAt, getBiomeColor } from "../../sim/biomes";
import { applyVoxelEdits, MATERIAL_SOLID } from "../../sim/collision";
import { getSurfaceHeightCore, getVoxelColor } from "../../sim/terrain-core";
import { getSimBridge } from "../../simBridge/simBridge";
import { chunkKey, ensureNeighborChunksForMinedVoxel } from "./chunkHelpers";
import { FrontierFillRenderer } from "./FrontierFillRenderer";
import { useFrontierHandler } from "./hooks/useFrontierHandler";
import { useLODManager } from "./hooks/useLODManager";
import { usePlayerChunkTracker } from "./hooks/usePlayerChunkTracker";
import { useVoxelChunkManager } from "./hooks/useVoxelChunkManager";
import { useVoxelLayerDebug } from "./hooks/useVoxelLayerDebug";
import { SimplifiedChunk } from "./SimplifiedChunk";
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
  const biomeColorCacheRef = useRef<Map<string, number>>(new Map());

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

  useEffect(() => {
    biomeColorCacheRef.current.clear();
  }, [
    biomeOverlayEnabled,
    cfg.terrain.quantizeScale,
    cfg.terrain.surfaceBias,
    cfg.terrain.waterLevel,
    seed,
  ]);

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

  const { activeChunks, addChunk, removeChunk, ensureInitialChunk, resetChunks } =
    useVoxelChunkManager({
      chunkSize,
      prestigeLevel,
      spawnX,
      spawnZ,
      seed,
      ensureCapacity,
      solidCountRef,
      addVoxel,
      removeVoxel,
    });

  const { sentFrontierChunkRef } = useFrontierHandler({
    voxelRenderMode,
    addVoxel,
    removeVoxel,
    clear,
    ensureCapacity,
    solidCountRef,
    flushRebuild,
    resetChunks,
    trackFrontierAdd,
    trackFrontierRemove,
    clearFrontierKeys,
    logDebugInfo,
  });

  usePlayerChunkTracker({
    chunkSize,
    voxelRenderMode,
    updateDebugBounds,
    sentFrontierChunkRef,
  });

  const { simplifiedChunks } = useLODManager({
    chunkSize,
    voxelRenderMode,
    addChunk,
    removeChunk,
    activeChunks,
  });

  // Remaining generic edits and mining logic
  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
      }

      const showFrontier = voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill";
      if (showFrontier) return;

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
    ensureInitialChunk,
    flushRebuild,
    removeVoxel,
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

      {Object.values(simplifiedChunks).map((c) => (
        <SimplifiedChunk
          key={chunkKey(c.cx, c.cy, c.cz)}
          cx={c.cx}
          cy={c.cy}
          cz={c.cz}
          size={chunkSize}
          lodLevel={c.lod}
        />
      ))}
    </group>
  );
};
