import React, { useCallback, useEffect, useRef } from "react";

import type { VoxelRenderMode } from "../../config/render";
import { useConfig } from "../../config/useConfig";
import { playerChunk, playerPosition } from "../../engine/playerState";
import { getBiomeAt, getBiomeColor } from "../../sim/biomes";
import { applyVoxelEdits, MATERIAL_SOLID, resetVoxelEdits } from "../../sim/collision";
import { getSurfaceHeightCore } from "../../sim/terrain-core";
import { getSimBridge } from "../../simBridge/simBridge";
import { forEachRadialChunk, getVoxelColor } from "../../utils";
import { ensureNeighborChunksForMinedVoxel, chunkKey } from "./chunkHelpers";
import { FrontierFillRenderer } from "./FrontierFillRenderer";
import { useFrontierLogic } from "./hooks/useFrontierLogic";
import { useVoxelChunkManager } from "./hooks/useVoxelChunkManager";
import { SimplifiedChunk } from "./SimplifiedChunk";
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

  const { sentFrontierChunkRef } = useFrontierLogic({ voxelRenderMode });
  const [simplifiedChunks, setSimplifiedChunks] = React.useState<
    Record<string, { cx: number; cy: number; cz: number; lod: number }>
  >({});
  const lastLodUpdatePos = useRef<{ x: number; y: number; z: number } | null>(null);


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


  const { activeChunks, addChunk, removeChunk, ensureInitialChunk, resetChunks } = useVoxelChunkManager({
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
          // LOD Logic
          // Only update if we moved enough to warrant a recalc (e.g. crossing a chunk boundary is effectively handled by the block above)
          // We define radius:
          const LOD0_DIST_SQ = 6 * 6; // Close: < 6 chunks (Instanced)
          const LOD1_DIST_SQ = 12 * 12; // Med: < 12 chunks (Simplified/Merged)
          const LOD2_DIST_SQ = 24 * 24; // Far: < 24 chunks (Proxy)
          // We iterate a larger area to find chunks to unload/downgrade
          // But iterating 24 chunks radius is expensive (50x50x50).
          // Optimization: Keep track of "loaded" list and only check them?
          // Or just stick to a reasonable radius for now.
          // Let's use 16 radius max for now?
          // Actually, forEachRadialChunk is efficient enough up to r=10. r=24 is 110k chunks. Too slow.
          // Let's limit current implementation to r=12.
          const MAX_RADIUS = 12;
          
          const newSimplified: Record<string, { cx: number; cy: number; cz: number; lod: number }> = {};
          const visitedKeys = new Set<string>();

          forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, MAX_RADIUS, 3, (c) => {
            visitedKeys.add(chunkKey(c.cx, c.cy, c.cz));
            const dx = c.cx - pcx;
            const dy = c.cy - pcy;
            const dz = c.cz - pcz;
            const distSq = dx*dx + dy*dy + dz*dz;
            
            if (distSq <= LOD0_DIST_SQ) {
              addChunk(c.cx, c.cy, c.cz);
              // Not simplified
            } else if (distSq <= LOD1_DIST_SQ) {
              removeChunk(c.cx, c.cy, c.cz); // Ensure it's not in instanced
              newSimplified[chunkKey(c.cx, c.cy, c.cz)] = { cx: c.cx, cy: c.cy, cz: c.cz, lod: 1 };
            } else if (distSq <= LOD2_DIST_SQ) {
              removeChunk(c.cx, c.cy, c.cz);
              newSimplified[chunkKey(c.cx, c.cy, c.cz)] = { cx: c.cx, cy: c.cy, cz: c.cz, lod: 2 };
            } else {
               removeChunk(c.cx, c.cy, c.cz);
            }
          });
          
          // Also need to clean up chunks that are NO LONGER in radius? 
          // removeChunk handles instanced.
          // setSimplifiedChunks replaces the whole object, so old simplifieds are gone.
          // But we need to make sure we removeChunk for things that were LOD0 and are now Out of Range.
          // The loop above handles things IN range.
          // What about things OUT of range?
          // useVoxelChunkManager tracks activeChunks. We can't iterate them efficiently there.
          // But strict radius cleanup: maybe just rely on LRU or "remove if dist > MAX"?
          // For now, chunks just persist?
          // NO, the loop covers 0..MAX_RADIUS. If a chunk was at dist 5 (LOD0) and now is dist 15 (Out), 
          // it won't be visited by the loop (if loop is max 12).
          // So it will stay in InstancedMesh!
          // We must iterate "all currently active instanced chunks" and check distance?
          // Accessing `activeChunks` from hook might require exposing it ref.
          // Or we assume the player doesn't teleport large distances, so standard walk covers boundaries.
          // If we restrict MAX_RADIUS to what we check, we should remove anything outside it.
          // But iterating all keys in `activeChunks` (Set) is fine if count is not huge.
          // Let's defer "Unload completely" to a cleanup-tick or similar.
          
          // Cleanup chunks that are out of processing radius
          if (activeChunks.current) {
            for (const key of activeChunks.current) {
              if (!visitedKeys.has(key)) {
                // Key format is cx,cy,cz
                const parts = key.split(",");
                if (parts.length === 3) {
                  const cx = parseInt(parts[0], 10);
                  const cy = parseInt(parts[1], 10);
                  const cz = parseInt(parts[2], 10);
                  removeChunk(cx, cy, cz);
                }
              }
            }
          }
          
          setSimplifiedChunks(newSimplified);
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
    removeChunk,
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
