import type { InstancedMesh, Object3D } from "three";
import { Color, InstancedBufferAttribute } from "three";

import { ensureGeometryHasVertexColors } from "../../../render/instanced";
import { getVoxelColor } from "../../../utils";

export type VoxelColorFn = (x: number, y: number, z: number) => number;

export const makeHeightColorFn = (waterLevel: number): VoxelColorFn => {
  return (_x: number, y: number, _z: number) => getVoxelColor(y, waterLevel);
};

export const getInitialCapacity = (chunkSize: number) => {
  return Math.max(512, chunkSize * chunkSize * chunkSize);
};

// Reusable Color object to avoid allocations during instance updates
const _colorTemp = new Color();

export const setVoxelInstance = (
  mesh: InstancedMesh,
  tmp: Object3D,
  index: number,
  x: number,
  y: number,
  z: number,
  getColor: VoxelColorFn,
) => {
  tmp.position.set(x, y, z);
  tmp.rotation.set(0, 0, 0);
  tmp.scale.set(1, 1, 1);
  tmp.updateMatrix();
  mesh.setMatrixAt(index, tmp.matrix);
  _colorTemp.setHex(getColor(x, y, z));
  mesh.setColorAt(index, _colorTemp);
};

export const rebuildVoxelInstances = (
  mesh: InstancedMesh,
  tmp: Object3D,
  positions: number[],
  getColor: VoxelColorFn,
) => {
  const count = Math.floor(positions.length / 3);
  for (let i = 0; i < count; i += 1) {
    const base = i * 3;
    setVoxelInstance(
      mesh,
      tmp,
      i,
      positions[base],
      positions[base + 1],
      positions[base + 2],
      getColor,
    );
  }

  mesh.count = count;
  if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};

export const ensureInstanceColors = (mesh: InstancedMesh, capacity: number) => {
  ensureGeometryHasVertexColors(mesh.geometry);
  if (!mesh.instanceColor || mesh.instanceColor.count !== capacity) {
    const colors = new Float32Array(capacity * 3);
    colors.fill(1);
    mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
    mesh.geometry.setAttribute("instanceColor", mesh.instanceColor);
    mesh.instanceColor.needsUpdate = true;
    return true;
  }

  return false;
};
