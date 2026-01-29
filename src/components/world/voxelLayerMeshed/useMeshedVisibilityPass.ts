import { useFrame } from "@react-three/fiber";
import { type MutableRefObject, type RefObject, useRef } from "react";
import { type Camera, type Group, Quaternion, Vector3 } from "three";

import { applyChunkVisibility, type LodThresholds } from "../../../render/lodUtils";
import { applyOcclusionVisibility, type OcclusionConfig, type OcclusionCuller } from "../../../render/occlusionCuller";

type ChunkVisibilityOptions = Parameters<typeof applyChunkVisibility>[3];

export const useMeshedVisibilityPass = (args: {
  groupRef: RefObject<Group | null>;
  camera: Camera;
  lodThresholds: LodThresholds;
  lodVisibilityOptions: ChunkVisibilityOptions;
  occlusionRef: MutableRefObject<OcclusionCuller | null>;
  occlusionConfig: OcclusionConfig;
}) => {
  const { groupRef, camera, lodThresholds, lodVisibilityOptions, occlusionRef, occlusionConfig } =
    args;

  // Camera movement sampling to avoid expensive per-frame visibility passes
  const lastCameraPosRef = useRef(new Vector3());
  const lastCameraQuatRef = useRef(new Quaternion());
  const frameCounterRef = useRef(0);

  // Throttle visibility and occlusion work to avoid long frame handlers.
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    // Only recompute visibility when the camera has moved/rotated significantly
    // or periodically as a fallback to handle other dynamic changes.
    // This reduces work during stationary cameras and avoids expensive per-frame loops.
    const camPos = camera.position;
    const camQuat = camera.quaternion;

    // Reused refs to avoid allocations
    const lastPos = lastCameraPosRef.current;
    const lastQuat = lastCameraQuatRef.current;

    const moved = camPos.distanceToSquared(lastPos) > 0.01; // ~> 0.1 units
    const rotated = Math.abs(camQuat.dot(lastQuat) - 1) > 1e-6;

    frameCounterRef.current = (frameCounterRef.current + 1) % 30; // fallback every 30 frames (~0.5s at 60fps)
    const periodic = frameCounterRef.current === 0;

    if (!moved && !rotated && !periodic) return;

    // Update last camera samples
    lastPos.copy(camPos);
    lastQuat.copy(camQuat);

    applyChunkVisibility(group.children, camera, lodThresholds, lodVisibilityOptions);

    const occlusion = occlusionRef.current;
    if (occlusionConfig.enabled && occlusion?.isSupported) {
      occlusion.update(group.children, camera);
      applyOcclusionVisibility(group.children);
    }
  });
};
