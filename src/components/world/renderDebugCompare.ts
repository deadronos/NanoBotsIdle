import { getVoxelMaterialAt, MATERIAL_SOLID } from "../../sim/collision";

export type ChunkCoord3 = { cx: number; cy: number; cz: number };

export type VoxelBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type XzBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const makeVoxelBoundsForChunkRadius = (
  center: ChunkCoord3,
  radiusChunks: number,
  chunkSize: number,
): VoxelBounds => {
  const minCx = center.cx - radiusChunks;
  const maxCx = center.cx + radiusChunks;
  const minCy = center.cy - radiusChunks;
  const maxCy = center.cy + radiusChunks;
  const minCz = center.cz - radiusChunks;
  const maxCz = center.cz + radiusChunks;

  return {
    minX: minCx * chunkSize,
    maxX: (maxCx + 1) * chunkSize - 1,
    minY: minCy * chunkSize,
    maxY: (maxCy + 1) * chunkSize - 1,
    minZ: minCz * chunkSize,
    maxZ: (maxCz + 1) * chunkSize - 1,
  };
};

export const voxelInBounds = (b: VoxelBounds, x: number, y: number, z: number) => {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ;
};

export const makeXzBoundsForChunkRadius = (center: ChunkCoord3, radiusChunks: number, chunkSize: number): XzBounds => {
  const minCx = center.cx - radiusChunks;
  const maxCx = center.cx + radiusChunks;
  const minCz = center.cz - radiusChunks;
  const maxCz = center.cz + radiusChunks;
  return {
    minX: minCx * chunkSize,
    maxX: (maxCx + 1) * chunkSize - 1,
    minZ: minCz * chunkSize,
    maxZ: (maxCz + 1) * chunkSize - 1,
  };
};

export const xzInBounds = (b: XzBounds, x: number, z: number) => {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
};

export const countDenseSolidsInChunk = (options: {
  cx: number;
  cy: number;
  cz: number;
  chunkSize: number;
  prestigeLevel: number;
}) => {
  const { cx, cy, cz, chunkSize, prestigeLevel } = options;
  const baseX = cx * chunkSize;
  const baseY = cy * chunkSize;
  const baseZ = cz * chunkSize;

  let count = 0;
  for (let x = 0; x < chunkSize; x += 1) {
    for (let y = 0; y < chunkSize; y += 1) {
      for (let z = 0; z < chunkSize; z += 1) {
        const wx = baseX + x;
        const wy = baseY + y;
        const wz = baseZ + z;
        if (getVoxelMaterialAt(wx, wy, wz, prestigeLevel) === MATERIAL_SOLID) count += 1;
      }
    }
  }
  return count;
};

const isSolid = (x: number, y: number, z: number, prestigeLevel: number) => {
  return getVoxelMaterialAt(x, y, z, prestigeLevel) === MATERIAL_SOLID;
};

export const countFrontierSolidsInChunk = (options: {
  cx: number;
  cy: number;
  cz: number;
  chunkSize: number;
  prestigeLevel: number;
}) => {
  const { cx, cy, cz, chunkSize, prestigeLevel } = options;
  const baseX = cx * chunkSize;
  const baseY = cy * chunkSize;
  const baseZ = cz * chunkSize;

  let count = 0;
  for (let x = 0; x < chunkSize; x += 1) {
    for (let y = 0; y < chunkSize; y += 1) {
      for (let z = 0; z < chunkSize; z += 1) {
        const wx = baseX + x;
        const wy = baseY + y;
        const wz = baseZ + z;

        if (!isSolid(wx, wy, wz, prestigeLevel)) continue;
        // Frontier heuristic: solid voxel with any non-solid 6-neighbor.
        if (
          !isSolid(wx + 1, wy, wz, prestigeLevel) ||
          !isSolid(wx - 1, wy, wz, prestigeLevel) ||
          !isSolid(wx, wy + 1, wz, prestigeLevel) ||
          !isSolid(wx, wy - 1, wz, prestigeLevel) ||
          !isSolid(wx, wy, wz + 1, prestigeLevel) ||
          !isSolid(wx, wy, wz - 1, prestigeLevel)
        ) {
          count += 1;
        }
      }
    }
  }

  return count;
};

export const getMissingFrontierVoxelsInChunk = (options: {
  cx: number;
  cy: number;
  cz: number;
  chunkSize: number;
  prestigeLevel: number;
  trackedKeys: Set<string>;
}) => {
  const { cx, cy, cz, chunkSize, prestigeLevel, trackedKeys } = options;
  const baseX = cx * chunkSize;
  const baseY = cy * chunkSize;
  const baseZ = cz * chunkSize;

  const missingKeys: string[] = [];
  let expectedFrontierCount = 0;

  for (let x = 0; x < chunkSize; x += 1) {
    for (let y = 0; y < chunkSize; y += 1) {
      for (let z = 0; z < chunkSize; z += 1) {
        const wx = baseX + x;
        const wy = baseY + y;
        const wz = baseZ + z;

        if (!isSolid(wx, wy, wz, prestigeLevel)) continue;

        // Check if exposed (frontier)
        if (
          !isSolid(wx + 1, wy, wz, prestigeLevel) ||
          !isSolid(wx - 1, wy, wz, prestigeLevel) ||
          !isSolid(wx, wy + 1, wz, prestigeLevel) ||
          !isSolid(wx, wy - 1, wz, prestigeLevel) ||
          !isSolid(wx, wy, wz + 1, prestigeLevel) ||
          !isSolid(wx, wy, wz - 1, prestigeLevel)
        ) {
          expectedFrontierCount++;
          const key = `${wx},${wy},${wz}`;
          if (!trackedKeys.has(key)) {
            missingKeys.push(key);
          }
        }
      }
    }
  }

  return { expectedFrontierCount, missingKeys };
};
