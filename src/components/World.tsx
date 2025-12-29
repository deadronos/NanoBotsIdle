import React, { useCallback, useEffect, useRef } from "react";

import { getConfig } from "../config/index";
import { applyVoxelEdits, MATERIAL_SOLID, resetVoxelEdits } from "../sim/collision";
import { getSeed } from "../sim/seed";
import { getSurfaceHeightCore } from "../sim/terrain-core";
import { getSimBridge } from "../simBridge/simBridge";
import { useUiStore } from "../ui/store";
import { chunkKey, ensureNeighborChunksForMinedVoxel, populateChunkVoxels } from "./world/chunkHelpers";
import { useInstancedVoxels } from "./world/useInstancedVoxels";

export const World: React.FC = () => {
  const activeChunks = useRef<Set<string>>(new Set());

  const cfg = getConfig();
  const bridge = getSimBridge();
  const prestigeLevel = useUiStore((state) => state.snapshot.prestigeLevel);
  const seed = getSeed(prestigeLevel);
  const chunkSize = cfg.terrain.chunkSize ?? 16;
  const spawnX = cfg.player.spawnX ?? 0;
  const spawnZ = cfg.player.spawnZ ?? 0;

  const { addVoxel, capacity, clear, ensureCapacity, flushRebuild, meshRef, removeVoxel, solidCountRef } =
    useInstancedVoxels(chunkSize);

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
    for (let cx = -1; cx <= 1; cx += 1) {
      for (let cz = -1; cz <= 1; cz += 1) {
        addChunk(baseCx + cx, cy, baseCz + cz);
      }
    }
  }, [addChunk, chunkSize, cfg.terrain.quantizeScale, cfg.terrain.surfaceBias, seed, spawnX, spawnZ]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.edits && frame.delta.edits.length > 0) {
        applyVoxelEdits(frame.delta.edits);
        frame.delta.edits.forEach((edit) => {
          if (edit.mat === MATERIAL_SOLID) {
            addVoxel(edit.x, edit.y, edit.z);
          } else {
            removeVoxel(edit.x, edit.y, edit.z);
          }
        });
      }

      if (frame.delta.frontierReset) {
        activeChunks.current.clear();
        clear();
        resetVoxelEdits();
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
    capacity,
    chunkSize,
    clear,
    ensureInitialChunk,
    flushRebuild,
    removeVoxel,
  ]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} metalness={0.1} vertexColors={true} />
      </instancedMesh>

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
