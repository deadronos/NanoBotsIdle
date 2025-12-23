import type * as THREE from "three";

import type { World } from "./World";
import { BlockId } from "./World";

export type BlockHit = {
  block: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number }; // face normal pointing outward from hit block
  t: number; // distance along ray
  id: BlockId;
};

/**
 * Fast voxel raycast via 3D DDA (Amanatides & Woo).
 */
export function pickBlockDDA(
  world: World,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDist: number,
): BlockHit | null {
  const dirX = direction.x;
  const dirY = direction.y;
  const dirZ = direction.z;
  const len = Math.hypot(dirX, dirY, dirZ);
  if (len === 0) return null;
  const dx = dirX / len;
  const dy = dirY / len;
  const dz = dirZ / len;
  const o = origin;

  let x = Math.floor(o.x);
  let y = Math.floor(o.y);
  let z = Math.floor(o.z);

  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  const tDeltaX = dx === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dx);
  const tDeltaY = dy === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dy);
  const tDeltaZ = dz === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dz);

  const frac = (v: number) => v - Math.floor(v);

  let tMaxX =
    dx === 0 ? Number.POSITIVE_INFINITY : (dx > 0 ? 1 - frac(o.x) : frac(o.x)) * tDeltaX;
  let tMaxY =
    dy === 0 ? Number.POSITIVE_INFINITY : (dy > 0 ? 1 - frac(o.y) : frac(o.y)) * tDeltaY;
  let tMaxZ =
    dz === 0 ? Number.POSITIVE_INFINITY : (dz > 0 ? 1 - frac(o.z) : frac(o.z)) * tDeltaZ;

  // Track which face we crossed last to get hit normal.
  let lastStep: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  let t = 0;

  const isHitBlock = (id: BlockId): boolean => {
    if (id === BlockId.Air) return false;
    // Treat water as "not hittable" by default; you can change this.
    if (id === BlockId.Water) return false;
    return true;
  };

  // Check starting cell
  const startId = world.getBlock(x, y, z);
  if (isHitBlock(startId)) {
    return {
      block: { x, y, z },
      normal: { x: 0, y: 1, z: 0 },
      t: 0,
      id: startId,
    };
  }

  while (t <= maxDist) {
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        t = tMaxX;
        tMaxX += tDeltaX;
        lastStep = { x: -stepX, y: 0, z: 0 };
      } else {
        z += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        lastStep = { x: 0, y: 0, z: -stepZ };
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY;
        t = tMaxY;
        tMaxY += tDeltaY;
        lastStep = { x: 0, y: -stepY, z: 0 };
      } else {
        z += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        lastStep = { x: 0, y: 0, z: -stepZ };
      }
    }

    const id = world.getBlock(x, y, z);
    if (isHitBlock(id)) {
      return {
        block: { x, y, z },
        normal: { x: lastStep.x, y: lastStep.y, z: lastStep.z },
        t,
        id,
      };
    }
  }

  return null;
}
