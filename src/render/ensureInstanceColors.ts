import type { InstancedMesh } from "three";
import { InstancedBufferAttribute } from "three";

import { ensureGeometryHasVertexColors } from "./instanced";

/**
 * Round up to next power of two for efficient buffer growth.
 * Reduces reallocation frequency by growing in larger steps.
 */
const nextPowerOfTwo = (n: number): number => {
  if (n <= 0) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

/**
 * Ensure an InstancedMesh has an `instanceColor` attribute with at least `capacity` instances.
 *
 * Returns `true` if the underlying buffer/attribute was changed.
 */
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
    mesh.instanceColor = new InstancedBufferAttribute(currentBuffer, 3);
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
  for (let i = fillStart; i < newColors.length; i += 1) {
    newColors[i] = 1;
  }

  mesh.instanceColor = new InstancedBufferAttribute(newColors, 3);
  mesh.geometry.setAttribute("instanceColor", mesh.instanceColor);
  mesh.instanceColor.needsUpdate = true;
  return true;
};
