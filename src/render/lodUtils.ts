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

export const applyChunkVisibility = (
  meshes: Iterable<Object3D>,
  camera: Camera,
  thresholds: LodThresholds,
  options?: {
    onLodChange?: (mesh: Mesh, lod: LodLevel) => void;
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
    const lod = selectLodLevel(distanceSq, thresholds);

    const prevLod: LodLevel | undefined = mesh.userData.lod;
    mesh.userData.lod = lod;
    mesh.userData.culledByFrustum = !frustumVisible;
    mesh.userData.culledByDistance = lod === "hidden";
    mesh.visible = frustumVisible && lod !== "hidden";

    if (options?.onLodChange && prevLod !== lod) {
      options.onLodChange(mesh, lod);
    }
  }
};
