import { getVoxelMaterialAt, MATERIAL_SOLID } from "../../sim/collision";

export const chunkKey = (cx: number, cy: number, cz: number) => `${cx},${cy},${cz}`;

const mod = (value: number, size: number) => ((value % size) + size) % size;

export const populateChunkVoxels = (options: {
  cx: number;
  cy: number;
  cz: number;
  chunkSize: number;
  prestigeLevel: number;
  addVoxel: (x: number, y: number, z: number) => void;
}) => {
  const { cx, cy, cz, chunkSize, prestigeLevel, addVoxel } = options;

  const size = chunkSize;
  const baseX = cx * size;
  const baseY = cy * size;
  const baseZ = cz * size;

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let z = 0; z < size; z += 1) {
        const wx = baseX + x;
        const wy = baseY + y;
        const wz = baseZ + z;
        if (getVoxelMaterialAt(wx, wy, wz, prestigeLevel) === MATERIAL_SOLID) {
          addVoxel(wx, wy, wz);
        }
      }
    }
  }
};

export const ensureNeighborChunksForMinedVoxel = (options: {
  x: number;
  y: number;
  z: number;
  chunkSize: number;
  addChunk: (cx: number, cy: number, cz: number) => void;
}) => {
  const { x, y, z, chunkSize, addChunk } = options;

  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);
  const cz = Math.floor(z / chunkSize);

  const lx = mod(x, chunkSize);
  const ly = mod(y, chunkSize);
  const lz = mod(z, chunkSize);

  if (lx === 0) addChunk(cx - 1, cy, cz);
  if (lx === chunkSize - 1) addChunk(cx + 1, cy, cz);
  if (ly === 0) addChunk(cx, cy - 1, cz);
  if (ly === chunkSize - 1) addChunk(cx, cy + 1, cz);
  if (lz === 0) addChunk(cx, cy, cz - 1);
  if (lz === chunkSize - 1) addChunk(cx, cy, cz + 1);
};

