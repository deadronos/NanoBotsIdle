import { useCallback, useRef } from "react";

import { useConfig } from "../../../config/useConfig";
import { getSurfaceHeightCore } from "../../../sim/terrain-core";
import { forEachRadialChunk } from "../../../utils";
import { chunkKey, populateChunkVoxels } from "../chunkHelpers";

interface UseVoxelChunkManagerProps {
  chunkSize: number;
  prestigeLevel: number;
  spawnX: number;
  spawnZ: number;
  seed: number;
  ensureCapacity: (capacity: number) => void;
  solidCountRef: React.MutableRefObject<number>;
  addVoxel: (x: number, y: number, z: number) => void;
}

export function useVoxelChunkManager({
  chunkSize,
  prestigeLevel,
  spawnX,
  spawnZ,
  seed,
  ensureCapacity,
  solidCountRef,
  addVoxel,
}: UseVoxelChunkManagerProps) {
  const activeChunks = useRef<Set<string>>(new Set());
  const cfg = useConfig();

  const addChunk = useCallback(
    (cx: number, cy: number, cz: number) => {
      const key = chunkKey(cx, cy, cz);
      if (activeChunks.current.has(key)) return;
      activeChunks.current.add(key);

      ensureCapacity(solidCountRef.current + chunkSize * chunkSize * chunkSize);
      populateChunkVoxels({ cx, cy, cz, chunkSize, prestigeLevel, addVoxel });
    },
    [addVoxel, chunkSize, ensureCapacity, prestigeLevel, solidCountRef]
  );

  const ensureInitialChunk = useCallback(() => {
    if (activeChunks.current.size > 0) return;
    const surfaceY = getSurfaceHeightCore(
      spawnX,
      spawnZ,
      seed,
      cfg.terrain.surfaceBias,
      cfg.terrain.quantizeScale
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

  const resetChunks = useCallback(() => {
      activeChunks.current.clear();
  }, [])

  return {
    activeChunks,
    addChunk,
    ensureInitialChunk,
    resetChunks
  };
}
