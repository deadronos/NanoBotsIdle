import { useEffect, useRef } from "react";

import { getSimBridge } from "../../../simBridge/simBridge";

interface UseFrontierLogicProps {
  voxelRenderMode: string;
}

export function useFrontierLogic({ voxelRenderMode }: UseFrontierLogicProps) {
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

  return {
    sentFrontierChunkRef,
    requestedFrontierSnapshotRef,
  };
}
