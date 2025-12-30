import type { Camera } from "three";
import { Frustum, Matrix4, Sphere } from "three";

const _projScreenMatrix = new Matrix4();
const _frustum = new Frustum();
const _sphere = new Sphere();

export const getFrustumFromCamera = (camera: Camera): Frustum => {
  _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_projScreenMatrix);
  return _frustum;
};

export const isSphereVisible = (
  frustum: Frustum,
  center: { x: number; y: number; z: number },
  radius: number,
): boolean => {
  _sphere.center.set(center.x, center.y, center.z);
  _sphere.radius = radius;
  return frustum.intersectsSphere(_sphere);
};
