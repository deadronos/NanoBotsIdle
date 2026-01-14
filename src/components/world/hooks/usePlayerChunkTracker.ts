import { useEffect, useRef } from "react";

import { VoxelRenderMode } from "../../../config/render";
import { playerChunk, playerPosition } from "../../../engine/playerState";
import { getSimBridge } from "../../../simBridge/simBridge";

interface UsePlayerChunkTrackerProps {
  chunkSize: number;
  voxelRenderMode: VoxelRenderMode;
  updateDebugBounds: (cx: number, cy: number, cz: number) => void;
  sentFrontierChunkRef: React.MutableRefObject<boolean>;
}

export function usePlayerChunkTracker({
  chunkSize,
  voxelRenderMode,
  updateDebugBounds,
  sentFrontierChunkRef,
}: UsePlayerChunkTrackerProps) {
  const bridge = getSimBridge();
  // We track the previous chunk locally to detect changes even if the global playerChunk was mutated elsewhere (unlikely but safe)
  // Actually, checking global playerChunk is what the original code did.

  useEffect(() => {
    return bridge.onFrame(() => {
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
        }
      }

      // Ensure frontier chunk is sent if needed (e.g. initial load or after reset)
      const showFrontier = voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill";
      if (showFrontier && !sentFrontierChunkRef.current) {
        bridge.enqueue({ t: "SET_PLAYER_CHUNK", cx: pcx, cy: pcy, cz: pcz });
        sentFrontierChunkRef.current = true;
      }
    });
  }, [bridge, chunkSize, sentFrontierChunkRef, updateDebugBounds, voxelRenderMode]);
}
