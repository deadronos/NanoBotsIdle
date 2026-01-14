import { useEffect, useRef, useState } from "react";

import type { VoxelRenderMode } from "../../../config/render";
import { playerPosition } from "../../../engine/playerState";
import { getSimBridge } from "../../../simBridge/simBridge";
import { forEachRadialChunk } from "../../../utils";
import { chunkKey } from "../chunkHelpers";

interface UseLODManagerProps {
  chunkSize: number;
  voxelRenderMode: VoxelRenderMode;
  addChunk: (cx: number, cy: number, cz: number) => void;
  removeChunk: (cx: number, cy: number, cz: number) => void;
  activeChunks: React.MutableRefObject<Set<string>>;
}

export function useLODManager({
  chunkSize,
  voxelRenderMode,
  addChunk,
  removeChunk,
  activeChunks,
}: UseLODManagerProps) {
  const bridge = getSimBridge();
  const [simplifiedChunks, setSimplifiedChunks] = useState<
    Record<string, { cx: number; cy: number; cz: number; lod: number }>
  >({});

  const lastPlayerChunk = useRef({ cx: NaN, cy: NaN, cz: NaN });

  useEffect(() => {
    return bridge.onFrame(() => {
      // Only run in dense mode (not frontier)
      if (voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill") {
        return;
      }

      const px = playerPosition.x;
      const py = playerPosition.y;
      const pz = playerPosition.z;
      const pcx = Math.floor(px / chunkSize);
      const pcy = Math.floor(py / chunkSize);
      const pcz = Math.floor(pz / chunkSize);

      if (
        pcx !== lastPlayerChunk.current.cx ||
        pcy !== lastPlayerChunk.current.cy ||
        pcz !== lastPlayerChunk.current.cz
      ) {
        lastPlayerChunk.current = { cx: pcx, cy: pcy, cz: pcz };

        // LOD Logic
        const LOD0_DIST_SQ = 6 * 6;
        const LOD1_DIST_SQ = 12 * 12;
        const LOD2_DIST_SQ = 24 * 24;
        const MAX_RADIUS = 12; // Limit to 12 as per original code

        const newSimplified: Record<string, { cx: number; cy: number; cz: number; lod: number }> =
          {};
        const visitedKeys = new Set<string>();

        forEachRadialChunk({ cx: pcx, cy: pcy, cz: pcz }, MAX_RADIUS, 3, (c) => {
          visitedKeys.add(chunkKey(c.cx, c.cy, c.cz));
          const dx = c.cx - pcx;
          const dy = c.cy - pcy;
          const dz = c.cz - pcz;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq <= LOD0_DIST_SQ) {
            addChunk(c.cx, c.cy, c.cz);
          } else if (distSq <= LOD1_DIST_SQ) {
            removeChunk(c.cx, c.cy, c.cz);
            newSimplified[chunkKey(c.cx, c.cy, c.cz)] = { cx: c.cx, cy: c.cy, cz: c.cz, lod: 1 };
          } else if (distSq <= LOD2_DIST_SQ) {
            removeChunk(c.cx, c.cy, c.cz);
            newSimplified[chunkKey(c.cx, c.cy, c.cz)] = { cx: c.cx, cy: c.cy, cz: c.cz, lod: 2 };
          } else {
            removeChunk(c.cx, c.cy, c.cz);
          }
        });

        // Cleanup chunks that are out of processing radius
        if (activeChunks.current) {
          for (const key of activeChunks.current) {
            if (!visitedKeys.has(key)) {
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
    });
  }, [bridge, chunkSize, voxelRenderMode, addChunk, removeChunk, activeChunks]);

  return { simplifiedChunks };
}
