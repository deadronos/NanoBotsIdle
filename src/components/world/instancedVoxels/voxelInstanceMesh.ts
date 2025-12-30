import type { InstancedMesh, Object3D } from "three";
import { InstancedBufferAttribute } from "three";

import { ensureGeometryHasVertexColors } from "../../../render/instanced";
import { getVoxelColor } from "../../../utils";

export const getInitialCapacity = (chunkSize: number) => {
  return Math.max(512, chunkSize * chunkSize * chunkSize);
};

export const setVoxelInstance = (
  mesh: InstancedMesh,
  tmp: Object3D,
  index: number,
  x: number,
  y: number,
  z: number,
  waterLevel: number,
) => {
  tmp.position.set(x, y, z);
  tmp.rotation.set(0, 0, 0);
  tmp.scale.set(1, 1, 1);
  tmp.updateMatrix();
  mesh.setMatrixAt(index, tmp.matrix);
  mesh.setColorAt(index, getVoxelColor(y, waterLevel));
};

export const rebuildVoxelInstances = (mesh: InstancedMesh, tmp: Object3D, positions: number[], waterLevel: number) => {
  const count = Math.floor(positions.length / 3);
  for (let i = 0; i < count; i += 1) {
    const base = i * 3;
    setVoxelInstance(mesh, tmp, i, positions[base], positions[base + 1], positions[base + 2], waterLevel);
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

