import type { Camera, Mesh, Object3D } from "three";

import { getFrustumFromCamera, isSphereVisible } from "./frustumUtils";

export type LodLevel = "high" | "low" | "hidden";

export type LodThresholds = {
  lowDistanceSq: number;
  hideDistanceSq: number;
};

export type LodThresholdOptions = {
  lowDistanceMultiplier?: number;
  hideDistanceMultiplier?: number;
};

export type LodProgressiveConfig = {
  enabled: boolean;
  refineDelayFrames: number;
};

export const createLodThresholds = (
  chunkSize: number,
  options?: LodThresholdOptions,
): LodThresholds => {
  const lowMultiplier = options?.lowDistanceMultiplier ?? 12;
  const hideMultiplier = options?.hideDistanceMultiplier ?? 24;

  const lowDistance = chunkSize * lowMultiplier;
  const hideDistance = chunkSize * hideMultiplier;

  return {
    lowDistanceSq: lowDistance * lowDistance,
    hideDistanceSq: hideDistance * hideDistance,
  };
};

export const selectLodLevel = (distanceSq: number, thresholds: LodThresholds): LodLevel => {
  if (distanceSq >= thresholds.hideDistanceSq) return "hidden";
  if (distanceSq >= thresholds.lowDistanceSq) return "low";
  return "high";
};

const distanceSqToPoint = (
  point: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
) => {
  const dx = point.x - target.x;
  const dy = point.y - target.y;
  const dz = point.z - target.z;
  return dx * dx + dy * dy + dz * dz;
};

const resetProgressiveState = (mesh: Mesh) => {
  delete mesh.userData.lodTarget;
  delete mesh.userData.lodRefineFrames;
};

export const resolveProgressiveLod = (
  mesh: Mesh,
  desired: LodLevel,
  config: LodProgressiveConfig,
): LodLevel => {
  if (!config.enabled) {
    resetProgressiveState(mesh);
    return desired;
  }

  if (desired !== "high") {
    resetProgressiveState(mesh);
    return desired;
  }

  const geometries = mesh.userData.lodGeometries as { low?: unknown } | undefined;
  if (!geometries?.low) {
    resetProgressiveState(mesh);
    return desired;
  }

  const current = mesh.userData.lod as LodLevel | undefined;
  if (current === "high") {
    resetProgressiveState(mesh);
    return "high";
  }

  if (mesh.userData.lodTarget !== "high") {
    mesh.userData.lodTarget = "high";
    mesh.userData.lodRefineFrames = Math.max(0, config.refineDelayFrames);
  }

  const remaining = mesh.userData.lodRefineFrames as number | undefined;
  if (!remaining || remaining <= 0) {
    resetProgressiveState(mesh);
    return "high";
  }

  mesh.userData.lodRefineFrames = remaining - 1;
  return "low";
};

export const applyChunkVisibility = (
  meshes: Iterable<Object3D>,
  camera: Camera,
  thresholds: LodThresholds,
  options?: {
    onLodChange?: (mesh: Mesh, lod: LodLevel) => void;
    progressive?: LodProgressiveConfig;
  },
) => {
  const frustum = getFrustumFromCamera(camera);

  for (const node of meshes) {
    if (!(node as Mesh).isMesh) continue;

    const mesh = node as Mesh;
    const geometry = mesh.geometry;
    if (!geometry) continue;

    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere();
    }

    const boundingSphere = geometry.boundingSphere;
    if (!boundingSphere) continue;

    const frustumVisible = isSphereVisible(frustum, boundingSphere.center, boundingSphere.radius);
    const distanceSq = distanceSqToPoint(camera.position, boundingSphere.center);
    const desiredLod = selectLodLevel(distanceSq, thresholds);
    const lod = options?.progressive
      ? resolveProgressiveLod(mesh, desiredLod, options.progressive)
      : desiredLod;

    const prevLod: LodLevel | undefined = mesh.userData.lod;
    mesh.userData.lod = lod;
    mesh.userData.culledByFrustum = !frustumVisible;
    mesh.userData.culledByDistance = desiredLod === "hidden";
    mesh.visible = frustumVisible && desiredLod !== "hidden";

    if (options?.onLodChange && prevLod !== lod) {
      options.onLodChange(mesh, lod);
    }
  }
};
