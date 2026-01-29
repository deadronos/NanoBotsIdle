import { type RefObject, useLayoutEffect } from "react";
import type { InstancedMesh } from "three";

import { ensureInstanceColors } from "../../../render/ensureInstanceColors";

export const useDroneMeshInit = (args: {
  maxDrones: number;
  bodyMeshRef: RefObject<InstancedMesh | null>;
  targetBoxMeshRef: RefObject<InstancedMesh | null>;
  miningLaserMeshRef: RefObject<InstancedMesh | null>;
  scanningLaserMeshRef: RefObject<InstancedMesh | null>;
  // Re-init when geometry/material swaps (GLB load)
  reinitKey?: unknown;
}) => {
  const {
    maxDrones,
    bodyMeshRef,
    targetBoxMeshRef,
    miningLaserMeshRef,
    scanningLaserMeshRef,
    reinitKey,
  } = args;

  useLayoutEffect(() => {
    const bodyMesh = bodyMeshRef.current;
    if (bodyMesh) {
      ensureInstanceColors(bodyMesh, maxDrones);
      bodyMesh.count = 0;
    }
  }, [bodyMeshRef, maxDrones, reinitKey]);

  useLayoutEffect(() => {
    const targetBoxMesh = targetBoxMeshRef.current;
    if (targetBoxMesh) {
      ensureInstanceColors(targetBoxMesh, maxDrones);
      targetBoxMesh.count = 0;
    }

    const miningLaserMesh = miningLaserMeshRef.current;
    if (miningLaserMesh) miningLaserMesh.count = 0;

    const scanningLaserMesh = scanningLaserMeshRef.current;
    if (scanningLaserMesh) scanningLaserMesh.count = 0;
  }, [maxDrones, miningLaserMeshRef, scanningLaserMeshRef, targetBoxMeshRef]);
};
