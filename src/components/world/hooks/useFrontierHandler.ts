import { useEffect, useRef } from "react";

import type { VoxelRenderMode } from "../../../config/render";
import { playerChunk } from "../../../engine/playerState";
import type { RenderDelta } from "../../../shared/protocol";
import { resetVoxelEdits } from "../../../sim/collision";
import { getSimBridge } from "../../../simBridge/simBridge";

export interface UseFrontierHandlerProps {
  voxelRenderMode: VoxelRenderMode;
  addVoxel: (x: number, y: number, z: number) => void;
  removeVoxel: (x: number, y: number, z: number) => void;
  clear: () => void;
  ensureCapacity: (capacity: number) => void;
  solidCountRef: React.MutableRefObject<number>;
  flushRebuild: () => void;
  resetChunks: () => void;
  trackFrontierAdd: (positions: Float32Array | number[]) => void;
  trackFrontierRemove: (positions: Float32Array | number[]) => void;
  clearFrontierKeys: () => void;
  logDebugInfo: (pcx: number, pcy: number, pcz: number, frame: { delta: RenderDelta }) => void;
}

export function useFrontierHandler({
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
}: UseFrontierHandlerProps) {
  const bridge = getSimBridge();
  const sentFrontierChunkRef = useRef(false);
  const requestedFrontierSnapshotRef = useRef(false);

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
  }, [voxelRenderMode, bridge]);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      if (frame.delta.frontierReset) {
        resetChunks();
        clear();
        resetVoxelEdits();
        sentFrontierChunkRef.current = false;
      }

      const showFrontier = voxelRenderMode === "frontier" || voxelRenderMode === "frontier-fill";

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

        logDebugInfo(playerChunk.cx, playerChunk.cy, playerChunk.cz, frame);

        flushRebuild();
      }
    });
  }, [
    bridge,
    voxelRenderMode,
    resetChunks,
    clear,
    clearFrontierKeys,
    ensureCapacity,
    solidCountRef,
    addVoxel,
    trackFrontierAdd,
    removeVoxel,
    trackFrontierRemove,
    logDebugInfo,
    flushRebuild,
  ]);

  return { sentFrontierChunkRef };
}
