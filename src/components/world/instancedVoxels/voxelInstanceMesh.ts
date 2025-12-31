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

/**
 * Round up to next power of two for efficient buffer growth.
 * Reduces reallocation frequency by growing in larger steps.
 */
const nextPowerOfTwo = (n: number): number => {
  if (n <= 0) return 1;
  // Fast power-of-two check and rounding
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

export const ensureInstanceColors = (mesh: InstancedMesh, capacity: number) => {
  ensureGeometryHasVertexColors(mesh.geometry);
  
  const currentBuffer = mesh.instanceColor?.array as Float32Array | undefined;
  const currentCapacity = mesh.instanceColor?.count ?? 0;
  
  // No change needed if capacity matches
  if (currentCapacity === capacity && mesh.instanceColor) {
    return false;
  }
  
  // Calculate buffer size using power-of-two growth to minimize reallocations
  const bufferCapacity = nextPowerOfTwo(capacity);
  const currentBufferCapacity = currentBuffer ? currentBuffer.length / 3 : 0;
  
  // Reuse existing buffer if it's large enough
  if (currentBuffer && currentBufferCapacity >= capacity) {
    // Buffer is large enough, just update the count
    mesh.instanceColor = new InstancedBufferAttribute(currentBuffer, 3);
    mesh.instanceColor.count = capacity;
    mesh.geometry.setAttribute("instanceColor", mesh.instanceColor);
    mesh.instanceColor.needsUpdate = true;
    return true;
  }
  
  // Need to allocate a new buffer
  const newColors = new Float32Array(bufferCapacity * 3);
  
  // Copy existing color data if present
  if (currentBuffer && currentCapacity > 0) {
    const copyLength = Math.min(currentCapacity * 3, newColors.length);
    newColors.set(currentBuffer.subarray(0, copyLength));
  }
  
  // Fill remaining space with default white color (1, 1, 1)
  const fillStart = currentCapacity * 3;
  for (let i = fillStart; i < newColors.length; i++) {
    newColors[i] = 1;
  }
  
  mesh.instanceColor = new InstancedBufferAttribute(newColors, 3);
  mesh.instanceColor.count = capacity;
  mesh.geometry.setAttribute("instanceColor", mesh.instanceColor);
  mesh.instanceColor.needsUpdate = true;
  return true;
};
